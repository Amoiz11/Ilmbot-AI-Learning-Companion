/**
 * Robust Markdown Math Delimiter Normalizer for IlmBot
 *
 * Pre-processes markdown responses so remark-math and rehype-katex
 * can reliably parse and render all mathematical expressions.
 *
 * Architecture:
 *  1. Single-pass tokenization that isolates and protects:
 *     - Fenced code blocks (``` ... ```)
 *     - Inline code (` ... `)
 *     - Existing display math ($$ ... $$)
 *     - Existing inline math ($ ... $)
 *     - LaTeX bracket display math (\[ ... \])
 *     - LaTeX paren inline math (\( ... \))
 *     - LaTeX environments (\begin{aligned} ... \end{aligned}, etc.)
 *
 *  2. Safe translation:
 *     - Fenced code & inline code: preserved 100% untouched.
 *     - Existing $ and $$ math: preserved untouched (never double-wrapped).
 *     - \[ ... \] -> normalized to \n\n$$\n...\n$$\n\n
 *     - \( ... \) -> normalized to $...$
 *     - \begin{env} ... \end{env} -> normalized to \n\n$$\n...\n$$\n\n
 *     - Plain text only:
 *       * Balanced-brace scanner wraps bare \frac{...}{...}, \sqrt{...}, \boxed{...}
 *       * Standalone mathematical symbols (\pi, \times, \alpha, etc.) wrapped in $...$
 *       * Never cuts across braces or injects '$' into existing math blocks.
 */

// Helper to extract balanced curly brace arguments: { ... }
function getBalancedBrace(str, startIndex) {
  if (str[startIndex] !== '{') return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: str.slice(startIndex, i + 1), endIndex: i + 1 };
      }
    }
  }
  return null;
}

// Commands that take 1 argument: \sqrt{...}, \boxed{...}, \text{...}, etc.
const SINGLE_ARG_CMDS = [
  'sqrt', 'boxed', 'text', 'mathrm', 'mathbf', 'mathit',
  'mathbb', 'mathcal', 'overline', 'underline', 'hat', 'vec',
  'bar', 'tilde', 'dot', 'ddot'
];

// Commands that take 2 arguments: \frac{...}{...}, \binom{...}{...}, etc.
const DOUBLE_ARG_CMDS = ['frac', 'binom', 'dbinom', 'tbinom', 'cfrac'];

// Standalone Greek letters and math operators that indicate math when outside math blocks
const GREEK_AND_SYMBOLS = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa',
  'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  'infty', 'partial', 'nabla', 'pm', 'mp', 'times', 'div', 'cdot', 'approx', 'neq', 'leq', 'geq',
  'forall', 'exists', 'in', 'notin', 'subset', 'supset', 'cup', 'cap', 'int', 'sum', 'prod'
];

const SYMBOL_REGEX = new RegExp(`(?<![a-zA-Z0-9$\\\\])\\\\(${GREEK_AND_SYMBOLS.join('|')})(?![a-zA-Z0-9])`, 'g');

/**
 * Normalizes math delimiters across markdown text while preserving code blocks.
 *
 * @param {string} text - Raw AI response or user markdown.
 * @returns {string} - Clean markdown with standard $ and $$ delimiters recognized by remark-math.
 */
export function preprocessMathDelimiters(text) {
  if (!text || typeof text !== 'string') return text || '';

  // Single-pass tokenizer that identifies all protected and special structures
  const tokenRegex = /(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$\n])+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\B\\begin\{(?:aligned|align|cases|equation|gather|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}[\s\S]*?\\end\{(?:aligned|align|cases|equation|gather|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}|\\begin\{(?:aligned|align|cases|equation|gather|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}[\s\S]*?\\end\{(?:aligned|align|cases|equation|gather|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\})/g;

  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', val: text.slice(lastIndex, match.index) });
    }
    const val = match[0];
    if (val.startsWith('```')) {
      tokens.push({ type: 'fenced_code', val });
    } else if (val.startsWith('`')) {
      tokens.push({ type: 'inline_code', val });
    } else if (val.startsWith('$$')) {
      tokens.push({ type: 'display_math', val });
    } else if (val.startsWith('$')) {
      tokens.push({ type: 'inline_math', val });
    } else if (val.startsWith('\\[')) {
      tokens.push({ type: 'bracket_math', val });
    } else if (val.startsWith('\\(')) {
      tokens.push({ type: 'paren_math', val });
    } else if (val.startsWith('\\begin')) {
      tokens.push({ type: 'env_math', val });
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', val: text.slice(lastIndex) });
  }

  return tokens.map(token => {
    switch (token.type) {
      case 'fenced_code':
      case 'inline_code':
      case 'display_math':
      case 'inline_math':
        // Protected blocks: leave untouched
        return token.val;

      case 'bracket_math': {
        // Normalize \[ ... \] to display math with blank lines for clean CommonMark parsing
        const inner = token.val.slice(2, -2).trim();
        return `\n\n$$\n${inner}\n$$\n\n`;
      }

      case 'paren_math': {
        // Normalize \( ... \) to inline math $ ... $
        const inner = token.val.slice(2, -2).trim();
        return `$${inner}$`;
      }

      case 'env_math': {
        // Normalize bare \begin{env} ... \end{env} to display math block
        const inner = token.val.trim();
        return `\n\n$$\n${inner}\n$$\n\n`;
      }

      case 'text': {
        let t = token.val;
        let out = '';
        let i = 0;

        // Scan character-by-character for bare LaTeX commands with balanced braces
        while (i < t.length) {
          if (t[i] === '\\') {
            let handled = false;

            // 1. Two-argument commands: \frac{...}{...}, \binom{...}{...}
            for (const cmd of DOUBLE_ARG_CMDS) {
              const prefix = `\\${cmd}`;
              if (t.startsWith(prefix, i)) {
                let cursor = i + prefix.length;
                while (cursor < t.length && (t[cursor] === ' ' || t[cursor] === '\t')) cursor++;
                const arg1 = getBalancedBrace(t, cursor);
                if (arg1) {
                  cursor = arg1.endIndex;
                  while (cursor < t.length && (t[cursor] === ' ' || t[cursor] === '\t')) cursor++;
                  const arg2 = getBalancedBrace(t, cursor);
                  if (arg2) {
                    const fullExpr = t.slice(i, arg2.endIndex);
                    out += `$${fullExpr}$`;
                    i = arg2.endIndex;
                    handled = true;
                    break;
                  }
                }
              }
            }
            if (handled) continue;

            // 2. Single-argument commands: \sqrt{...}, \boxed{...}, \text{...}
            for (const cmd of SINGLE_ARG_CMDS) {
              const prefix = `\\${cmd}`;
              if (t.startsWith(prefix, i)) {
                let cursor = i + prefix.length;
                // Support optional bracket argument for \sqrt[3]{x}
                if (cmd === 'sqrt' && t[cursor] === '[') {
                  const closeBracket = t.indexOf(']', cursor);
                  if (closeBracket !== -1) cursor = closeBracket + 1;
                }
                while (cursor < t.length && (t[cursor] === ' ' || t[cursor] === '\t')) cursor++;
                const arg = getBalancedBrace(t, cursor);
                if (arg) {
                  const fullExpr = t.slice(i, arg.endIndex);
                  out += `$${fullExpr}$`;
                  i = arg.endIndex;
                  handled = true;
                  break;
                }
              }
            }
            if (handled) continue;
          }

          out += t[i];
          i++;
        }

        // 3. Wrap bare mathematical Greek letters & operators in $...$
        out = out.replace(SYMBOL_REGEX, '$\\$1$');

        return out;
      }
    }
  }).join('');
}
