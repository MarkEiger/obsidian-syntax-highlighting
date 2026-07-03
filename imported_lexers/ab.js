/** @type {import('./lexer-api').Lexer} */
module.exports = {
  // stable identity — never change this between versions
  id: 'mark.ab',
  version: 1,

  // display name shown in settings — independent of the extension
  name: 'ab',
  // default code-block tag: ```ab fences (user can re-target in settings)
  defaultExtension: 'ab',

  // every colour this lexer uses -> its private pool
  requiredColours: [
    { name: 'AB Orange', value: '#ff8800' },
  ],

  // token type -> one of the names declared above
  colourMapping: {
    ab: 'AB Orange',
  },

  // find every appearance of `ab.` and emit it as an 'ab' token
  tokenize(input) {
    const tokens = [];
    for (const match of input.matchAll(/ab\./g)) {
      tokens.push({ text: match[0], type: 'ab' });
    }
    return tokens;
  },
};
