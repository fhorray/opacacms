/**
 * Compiles a template string containing:
 * - {{ expression }} for interpolation
 * - {% if condition %}, {% else %}, {% endif %} for conditionals
 * - {% for item in iterable %}, {% endfor %} for loops
 * into a reusable JavaScript function.
 */
export function compileTemplate(template: string): (context: any) => string {
  let code = 'const p = [];\n';
  let cursor = 0;

  // Helper to escape string for JS string literal
  const escape = (str: string) => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  };

  // Match interpolation {{ ... }} or statements {% ... %}
  const regex = /\{\{\s*([\s\S]*?)\s*\}\}|\{\%\s*([\s\S]*?)\s*\%\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const textBefore = template.slice(cursor, match.index);
    if (textBefore) {
      code += `p.push('${escape(textBefore)}');\n`;
    }

    const interpolation = match[1];
    const statement = match[2];

    if (interpolation !== undefined) {
      // Direct interpolation
      code += `p.push(${interpolation});\n`;
    } else if (statement !== undefined) {
      const trimmed = statement.trim();
      const parts = trimmed.split(/\s+/);
      const command = parts[0];

      if (command === 'if') {
        const condition = trimmed.slice(2).trim();
        code += `if (${condition}) {\n`;
      } else if (command === 'else') {
        code += `} else {\n`;
      } else if (command === 'endif') {
        code += `}\n`;
      } else if (command === 'for') {
        // e.g. "for item in items" -> "for (const item of items) {"
        const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(.+)$/);
        if (forMatch) {
          const [, item, list] = forMatch;
          code += `for (const ${item} of ${list}) {\n`;
        } else {
          throw new Error(`Invalid for loop statement: ${trimmed}`);
        }
      } else if (command === 'endfor') {
        code += `}\n`;
      } else {
        // Fallback for arbitrary JS inside statement tags
        code += `${trimmed}\n`;
      }
    }

    cursor = regex.lastIndex;
  }

  const textRemaining = template.slice(cursor);
  if (textRemaining) {
    code += `p.push('${escape(textRemaining)}');\n`;
  }

  code += "return p.join('');\n";

  // Wrap in a function using 'with(this)' to allow scoped resolution of properties
  const fnBody = `with(this || {}) {\n${code}\n}`;
  try {
    const fn = new Function(fnBody);
    return (context: any) => {
      try {
        return fn.call(context);
      } catch (err: any) {
        console.error('Error executing compiled template:', err);
        console.error('Context:', context);
        throw err;
      }
    };
  } catch (err: any) {
    console.error('Failed to compile template. Generated JS code:\n', code);
    throw err;
  }
}

/**
 * Directly renders a template with the given context.
 */
export function renderTemplate(template: string, context: any): string {
  const compiled = compileTemplate(template);
  return compiled(context);
}
export default renderTemplate;
export { compileTemplate as compile };
