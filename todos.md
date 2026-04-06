here are all the todos i can thing about so far:

done:
- add the extention as a configurable for every lexer
- split the settings into two parts: pallete and lexersm with visible deviders
- make the Lexers settings actually save state
- add default settings for every lexer

todo:
- when a new colour is added to the pallete, it should imdiatly appear for the lexers too
- do so by keeping a handle to the dropdown just like with the colour picker
- also if a colour that is used is deleted, need to deside what to do
- maybe disable the button if its in use (would need a nice represenatation)
- also might wanna add a confirmation menu to deliting a colour
- add a way to add a new colour to the pallete from the lexers settings 
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