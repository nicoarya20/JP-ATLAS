// Router behaviour: go/back, replace, params, role guards, sheets and refusal toasts. Uses test-only screens.
import { describe, expect, it } from 'vitest';
import { act, screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { screen, sheet } from '../core/registry';
import { useApp } from '../core/app.context';
import { Btn } from '../kit';
import { renderApp } from './render';

// test-only screens
function A() {
  return (
    <div>
      <h1>Screen A</h1>
      <Btn go="t.b" task={7}>To B</Btn>
      <Btn go="t.admin">To admin</Btn>
      <Btn go="t.missing">To missing</Btn>
      <Btn sheet="t.sheet">Open sheet</Btn>
      <Btn go="t.b" replace>Replace B</Btn>
    </div>
  );
}
function B({ params }) {
  const { back, depth } = useApp();
  return <div><h1>Screen B task {params.task ?? 'none'} depth {depth}</h1><button onClick={() => back()}>Back</button></div>;
}
function S() {
  return <div><p>Sheet body</p><Btn close go="t.b">Close and go</Btn></div>;
}
screen('t.a', { title: 'A', group: 'Test', Component: A });
screen('t.b', { title: 'B', group: 'Test', Component: B });
screen('t.admin', { title: 'Admin only', group: 'Test', roles: ['admin'], Component: () => <h1>Admin area</h1> });
sheet('t.sheet', { title: 'Test sheet', group: 'Test', Component: S });

describe('router', () => {
  it('pushes with params and pops back', async () => {
    renderApp('t.a');
    await userEvent.click(dom.getByRole('button', { name: 'To B' }));
    expect(dom.getByRole('heading', { name: 'Screen B task 7 depth 2' })).toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Back' }));
    expect(dom.getByRole('heading', { name: 'Screen A' })).toBeInTheDocument();
  });

  it('replace resets the history', async () => {
    renderApp('t.a');
    await userEvent.click(dom.getByRole('button', { name: 'Replace B' }));
    expect(dom.getByRole('heading', { name: 'Screen B task none depth 1' })).toBeInTheDocument();
  });

  it('refuses screens the role may not open, with a toast', async () => {
    renderApp('t.a', 'pm');
    await userEvent.click(dom.getByRole('button', { name: 'To admin' }));
    expect(dom.getByRole('heading', { name: 'Screen A' })).toBeInTheDocument();
    expect(await dom.findByText('Not available for Project Manager')).toBeInTheDocument();
  });

  it('lets the allowed role in', async () => {
    renderApp('t.a', 'admin');
    await userEvent.click(dom.getByRole('button', { name: 'To admin' }));
    expect(dom.getByRole('heading', { name: 'Admin area' })).toBeInTheDocument();
  });

  it('toasts for ids that are not built yet', async () => {
    renderApp('t.a');
    await userEvent.click(dom.getByRole('button', { name: 'To missing' }));
    expect(await dom.findByText('Screen "t.missing" not built yet')).toBeInTheDocument();
  });

  it('opens a sheet over the screen, and close+go leaves it for the next screen', async () => {
    renderApp('t.a');
    await userEvent.click(dom.getByRole('button', { name: 'Open sheet' }));
    expect(await dom.findByText('Sheet body')).toBeInTheDocument();
    await userEvent.click(dom.getByRole('button', { name: 'Close and go' }));
    expect(dom.getByRole('heading', { name: /Screen B/ })).toBeInTheDocument();
    await act(async () => {});
    expect(dom.queryByText('Sheet body')).not.toBeInTheDocument();
  });

  it('writes the current screen and role into the URL', async () => {
    renderApp('t.a', 'member');
    await userEvent.click(dom.getByRole('button', { name: 'To B' }));
    expect(window.location.hash).toBe('#t.b');
    expect(new URLSearchParams(window.location.search).get('role')).toBe('member');
  });
});
