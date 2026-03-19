import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import * as cli from '../src/cli.js';

const EXPECTED_SKILLS = ['8004', 'filecoin', 'lido', 'moonpay', 'synthesis', 'uniswap'];

describe('skills directory', () => {
  it('getSkillsDir returns a path ending in skills/', () => {
    const dir = cli.getSkillsDir();
    expect(dir).toMatch(/skills$/);
  });

  it('all 6 skill directories exist with SKILL.md', async () => {
    const skillsDir = cli.getSkillsDir();
    const entries = await readdir(skillsDir);
    for (const name of EXPECTED_SKILLS) {
      expect(entries).toContain(name);
      const content = await readFile(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('all SKILL.md files have valid frontmatter with name and description', async () => {
    const skills = await cli.listSkills();
    const names = skills.map((s) => s.name).sort();
    expect(names).toEqual(EXPECTED_SKILLS);
    for (const skill of skills) {
      expect(skill.description.length).toBeGreaterThan(10);
    }
  });

  it('listSkills returns an empty list when the skills directory is missing', async () => {
    const skillsDir = cli.getSkillsDir();
    const backupDir = `${skillsDir}.bak-test-missing`;
    const { rename } = await import('node:fs/promises');

    await rename(skillsDir, backupDir);
    try {
      await expect(cli.listSkills()).resolves.toEqual([]);
    } finally {
      await rename(backupDir, skillsDir);
    }
  });

  it('listSkills skips entries without a readable SKILL.md', async () => {
    const skillsDir = cli.getSkillsDir();
    const brokenDir = path.join(skillsDir, 'broken-skill');
    const { mkdir, rm } = await import('node:fs/promises');

    await mkdir(brokenDir, { recursive: true });
    try {
      const skills = await cli.listSkills();
      expect(skills.find((skill) => skill.dir === 'broken-skill')).toBeUndefined();
    } finally {
      await rm(brokenDir, { recursive: true, force: true });
    }
  });

  it('listSkills skips files without frontmatter and tolerates non-key lines in frontmatter', async () => {
    const skillsDir = cli.getSkillsDir();
    const noFrontmatterDir = path.join(skillsDir, 'no-frontmatter');
    const oddFrontmatterDir = path.join(skillsDir, 'odd-frontmatter');
    const { mkdir, rm, writeFile } = await import('node:fs/promises');

    await mkdir(noFrontmatterDir, { recursive: true });
    await mkdir(oddFrontmatterDir, { recursive: true });
    await writeFile(path.join(noFrontmatterDir, 'SKILL.md'), 'plain text only');
    await writeFile(
      path.join(oddFrontmatterDir, 'SKILL.md'),
      ['---', 'name: odd-frontmatter', 'this line has no colon', 'description: still valid', '---'].join('\n'),
    );

    try {
      const skills = await cli.listSkills();
      expect(skills.find((skill) => skill.dir === 'no-frontmatter')).toBeUndefined();
      expect(skills.find((skill) => skill.dir === 'odd-frontmatter')?.name).toBe('odd-frontmatter');
    } finally {
      await rm(noFrontmatterDir, { recursive: true, force: true });
      await rm(oddFrontmatterDir, { recursive: true, force: true });
    }
  });
});

describe('synth skills command', () => {
  let stdoutWrite: any;
  let stderrWrite: any;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });

  it('synth skills lists all skills', async () => {
    const code = await cli.runSkills([]);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output).toContain('Available skills');
    for (const name of EXPECTED_SKILLS) {
      expect(output).toContain(name);
    }
  });

  it('synth skills path prints the skills directory', async () => {
    const code = await cli.runSkills(['path']);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output.trim()).toMatch(/skills$/);
  });

  it('synth skills show <name> prints skill content', async () => {
    const code = await cli.runSkills(['show', 'uniswap']);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output).toContain('uniswap');
    expect(output).toContain('---');
  });

  it('synth skills show returns 1 for unknown skill', async () => {
    const code = await cli.runSkills(['show', 'nonexistent']);
    expect(code).toBe(1);
    const errOutput = stderrWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(errOutput).toContain('Skill not found');
  });

  it('synth skills show with no name returns 1', async () => {
    const code = await cli.runSkills(['show']);
    expect(code).toBe(1);
  });

  it('run() routes to skills command', async () => {
    const code = await cli.run(['skills'], vi.fn() as any);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output).toContain('Available skills');
  });

  it('run() routes to skills path', async () => {
    const code = await cli.run(['skills', 'path'], vi.fn() as any);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output.trim()).toMatch(/skills$/);
  });

  it('run() routes to skills show', async () => {
    const code = await cli.run(['skills', 'show', 'lido'], vi.fn() as any);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output).toContain('lido');
    expect(output).toContain('stake');
  });

  it('runSkills prints no skills found when the skills directory is empty', async () => {
    const skillsDir = cli.getSkillsDir();
    const backupDir = `${skillsDir}.bak-test`;
    const { rename, mkdir, rm } = await import('node:fs/promises');

    await rename(skillsDir, backupDir);
    await mkdir(skillsDir);

    try {
      const code = await cli.runSkills([]);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('No skills found.');
    } finally {
      await rm(skillsDir, { recursive: true, force: true });
      await rename(backupDir, skillsDir);
    }
  });
});
