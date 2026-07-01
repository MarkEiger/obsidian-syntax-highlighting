here are all the todos i can thing about so far:


todo:
- add the RequestColour feature for lexers
    - perhaps split into private colours and public ones, so that each plugin might have its own pallete, and the global ones, thus enabling namespaces, and a lexer may be able to reuse a colour
    - needto finilize mythoughts here for optimal UX
    - might add a button of "add to pallete" for private colours so a user can reuse colours he imported if he liked them
    - also add restore defaults option
- find a way to be able to add/remove lexer after compile time, not onlu during
- write a proper nasm lexer



# Colours Menu:
the pallete stays as is.

each lexer is required to defind all the colours it will use.
those colours are added to its private namespace.
for each lexer:
    when selecting a colour from a lexer, the options are the global pallete and the lexers private colours
    inside 3dots menu for eahc lexer:
        add a button of restore to defaults for each lexer
            this asks whether to keep the private custom colours or delete them
            the colours the lexer supplied are immutable i.e cant be deleted
        add a button of view private pallete for a lexer to show all its colours
            there should be a copy to global pallete button for each colour
            if the name is in use offer rename/override
    adding a custom colour from within a lexer adds it to its private pool
    in the dropdown have 2 sub drop down, global and private pallete

also add isCustom, so that only custom can be changed in any way, 
for lexer supplied colour isCustom is False
also add a unique id to each colour generated when it is added, so its stable across changes

the structure in data.json will be simple, its a uuid for each lexer that is a key to all the settings
also have for each lexer:
    pallete

and add a global pallete that includes all colours for O(1) lookup
possibly need ro resturct the pallete class to support this


so for the model i will use for storage is
```ts
type Colour = {
    name: string,
    value: string,
    is_custom: boolean
}
```

for O(1) access:
```ts
settings.colours = Record<string, Colour> //uuid to actual Colour
```

for organization:
```ts
settings.lexers[n].colours = string // the uuid of the colour
```