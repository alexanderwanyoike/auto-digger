import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { App } from './App';

afterEach(cleanup);

test('opens a digging desk with honest empty states and inactive upcoming features', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Digging desk' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Your next find starts here.' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Your crate' })).toBeInTheDocument();
  expect(screen.getByText('Discogs not connected')).toBeInTheDocument();
  expect(screen.getByText('No records saved yet.')).toBeInTheDocument();
  expect(screen.getByLabelText('Label')).toBeDisabled();
  expect(screen.getByLabelText('Artist')).toBeDisabled();
  expect(screen.getByLabelText('Year')).toBeDisabled();
  expect(screen.getByLabelText('Genre')).toBeDisabled();
  expect(screen.getByLabelText('Style')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Start digging' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  expect(screen.getByText('Discogs connection comes in Phase 2.')).toBeInTheDocument();
  expect(screen.getByText('YouTube playback comes in Phase 5.')).toBeInTheDocument();
});
