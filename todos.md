here are all the todos i can thing about so far:

done:
- add the extention as a configurable for every lexer
- split the settings into two parts: pallete and lexersm with visible deviders
- make the Lexers settings actually save state
- add default settings for every lexer

todo:
- break lexer into the interface for users which is jsut the static part
- create my own "lexerWithSettings" that tokenizes and then applies the colour by tghe current seetings
- the stored data needs to be all the settings with a unqique id to be mapped to the lexer
- first time round these fields are to be initialized by the lexers defaults supplied in the interface





- start actually using the lexers
- when a new colour is added to the pallete, it should imdiatly appear for the lexers too (i.e syntc lexers and pallete somehow)
- also if a colour that is used is deleted, need to deside what to do
- maybe disable the button if its in use (would need a nice represenatation)
- also might wanna add a confirmation menu to deliting a colour
- add a way to add a new colour to the pallete from the lexers settings 
- make the lexers run not only on text chnage, but on settigns change too



# Fixing the lexers
the idea is to add a 
```ts
registerLexer(defaultExtention: string, ...);
```

now the main question is what will be the second argument

here is a sample from claude:
```ts
// Define the interface for instances
interface Tokenizer {
  tokenize(input: string): string[];
}

// Define the type for the class constructor itself
type TokenizerClass = new (...args: any[]) => Tokenizer;

// Dictionary of string to class
const tokenizers: Record<string, TokenizerClass> = {};

interface Tokenizer {
  tokenize(input: string): string[];
}

type TokenizerClass = new (...args: any[]) => Tokenizer;

// Concrete classes
class WhitespaceTokenizer implements Tokenizer {
  constructor(private lowercase: boolean = false) {}

  tokenize(input: string): string[] {
    const text = this.lowercase ? input.toLowerCase() : input;
    return text.split(/\s+/);
  }
}

class CharTokenizer implements Tokenizer {
  constructor(private separator: string = "") {}

  tokenize(input: string): string[] {
    return input.split(this.separator);
  }
}

// The dict
const tokenizers: Record<string, TokenizerClass> = {
  whitespace: WhitespaceTokenizer,
  char: CharTokenizer,
};

// Usage — instantiate from the dict and call tokenize()
const MyTokenizer = tokenizers["whitespace"];
const instance = new MyTokenizer(true);
console.log(instance.tokenize("Hello World")); // ["hello", "world"]
```


before i forget (slipknot reference)
here is what im going to do:
im such a fuckface for not thinking about it before

the serealized data is just
```ts
class LexerSettings
{
    filenamne: string.
    extention: string,
    coloursMapping: ColourMapping,

}
```

```ts
abstract class Lexer
{
    filename: string;
    extention: string;
    coloursMapping: string;
    constructor(settings: LexerSettings);
    tokenize();
    getDefaultExtention();
    getDefaultColoursMapping();
    getFileName();


}

```


and so i can pass the settings to the lexer, according to defaultExtention by having a dict of classes


actually lets reorganized


what i actually want is to add to the abstract class a function of
`applySettings()`
which gets the settings, so that everything is organizedbetter and cleaner

to make life easier, just make the constructor accept whatever i wanted apply setting to accept
problem solver

anbd the dict is indeed a extention to constuctir mapping





