/**
 * converts an array of arrays to a csv string
 *
 * from https://github.com/vanillaes/csv/blob/main/index.js
 *
 * @param array data to convert
 * @param options options
 *   - eof: add a new line at the end of the file
 * @returns csv string
 */
export const csvToString = (array: string[][], options = { eof: true }): string => {
  const ctx = Object.create(null);
  ctx.options = options;
  ctx.options.eof = ctx.options.eof !== undefined ? ctx.options.eof : true;
  ctx.row = 1;
  ctx.col = 1;
  ctx.output = '';

  const needsDelimiters = /"|,|\r\n|\n|\r/;

  array.forEach((row, rIdx) => {
    let entry = '';
    ctx.col = 1;
    row.forEach((col, cIdx) => {
      if (typeof col === 'string') {
        col = col.replace(/"/g, '""');
        col = needsDelimiters.test(col) ? `"${col}"` : col;
      }
      entry += col;
      if (cIdx !== row.length - 1) {
        entry += ',';
      }
      ctx.col++;
    });
    switch (true) {
      case ctx.options.eof:
      case !ctx.options.eof && rIdx !== array.length - 1:
        ctx.output += `${entry}\n`;
        break;
      default:
        ctx.output += `${entry}`;
        break;
    }
    ctx.row++;
  });

  return ctx.output;
};
