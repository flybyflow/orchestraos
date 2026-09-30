import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    // Two patterns we removed on 2026-09-30, kept out by the AST rather than by memory.
    //
    // WHY HERE RATHER THAN A GREP. A grep asserting a pattern is gone cannot tell the pattern
    // in code from the pattern in the comment explaining its removal — and writing that comment
    // is what makes the assertion fail. It caught us three times in one night. eslint already
    // parses these files to an AST on every lint, so a selector rule ignores comments by
    // construction, cannot be fooled by a string literal either, and needs no new dependency
    // or pipeline step. (review's point, and it is strictly better than the regex recipe.)
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // messageAgent() posted to /api/agents/:id/message, which wrote a file into
          // queue/inbox/ that no live agent reads, and returned {sent:true} — so the UI
          // reported success while the operator's instruction vanished. Deleted in dcee8d0;
          // the endpoint now 410s. Use sendToAgent() from lib/agentSend.ts.
          selector: "Identifier[name='messageAgent']",
          message:
            'messageAgent() was deleted: it wrote to queue/inbox/, which nothing reads, and ' +
            'reported success anyway. Use sendToAgent() from lib/agentSend.ts (POST /:id/send).',
        },
        {
          // Styling a send result by comparing it to the literal 'Sent' held only while every
          // success said exactly that. The durable path also reports "Queued — agent is busy"
          // and "Held — …", both successes, and both rendered RED (d3cd511). The message is for
          // the operator; the flag is for the code.
          selector: "BinaryExpression[operator=/^(===|!==|==|!=)$/] > Literal[value='Sent']",
          message:
            'Do not branch on the literal "Sent": queued and held are also successes and this ' +
            'test called them failures. Carry success as a boolean instead.',
        },
      ],
    },
  },
])
