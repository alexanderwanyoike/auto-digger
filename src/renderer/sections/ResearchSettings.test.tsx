import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ResearchSettings } from './ResearchSettings';

test('shows raw Windows executable and arguments for copying into Codex setup fields', async () => {
  const user = userEvent.setup();
  const configuration = {
    command: 'C:\\Users\\Alex\\Auto Digger\\auto-digger.exe',
    args: [
      'C:\\Users\\Alex\\Auto Digger\\out\\main\\mcp.js',
      '--connection',
      'C:\\Users\\Alex\\AppData\\mcp-connection.json',
    ],
    env: { ELECTRON_RUN_AS_NODE: '1' as const },
  };
  window.researchAccess = {
    status: () => Promise.resolve({ ok: true, value: { enabled: true, configuration } }),
    start: vi.fn(),
    stop: vi.fn(),
    openSource: vi.fn(),
    saveExtension: vi.fn(),
  };
  try {
    render(<ResearchSettings />);
    await user.click(await screen.findByText('Codex and other local clients'));
    expect(screen.getByLabelText('Command')).toHaveValue(configuration.command);
    configuration.args.forEach((argument, index) => {
      expect(screen.getByLabelText(`Argument ${(index + 1).toString()}`)).toHaveValue(argument);
    });
  } finally {
    delete window.researchAccess;
  }
});
