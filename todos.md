here are all the todos i can thing about so far:

done:
- add the extention as a configurable for every lexer
- split the settings into two parts: pallete and lexersm with visible deviders
- make the Lexers settings actually save state
- add default settings for every lexer

todo:
- chnage the colour picker for token types to a dropdown, with the last option being adding a new colour


- add the pallete as options to the lexers
- make a switch button between the colour picker and the pallete dropdown
- start actually using the lexers
- make the lexers run not only on text chnage, but on settigns change too



to make lexers serializable i need to make a couple of chnages to the architecure
a comoon class, with no different implementationshe of it since it wont survive serialization and deserialization, instead add the function of tokenice to a dict, with its hash as the key, and store the key in the serialzied state

so now the common lexer is




```ts
tokenize_dict: Map<int, function>

class Lexer
{
    defaultExtension: string;
    extention: string;
    defaultColoursMapping: ColourMapping[];
    coloursMapping: ColourMapping[];
    filename: string;
}


```