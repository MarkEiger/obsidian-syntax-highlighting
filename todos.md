here are all the todos i can thing about so far:


todo:
- replace map with record
- chnaging the code block extention right now doesnt make the kexer target the new extention 
- make the lexers run not only on text chnage, but on settigns change too

- enable the colour picker
- when a new colour is added to the pallete, it should imdiatly appear for the lexers too (i.e syntc lexers and pallete somehow)
- forbid deleteing colours that are in use
- maybe disable the button if its in use (would need a nice represenatation)
- also might wanna add a confirmation menu to deleting a colour
- add a way to add a new colour to the pallete from the lexers settings 



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





