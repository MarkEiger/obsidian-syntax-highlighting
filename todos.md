// first make every lexer has its own folder, so that multi file lexer can become a vlaid option

- add a per lexer themes option so every kexer can have muliple presets
// also maybe separate the rquired colours into their own file, for future import/export palletes to be easy


// set up a lexer store mechanism, the lexers themselves should be in a different repo,
// so that one can easily explore availble lexers jsut liek obsidian plugins


// add import/export custom colours so that they can be shared as well and on the store too, in a different branch
// upon importing a conflicting colour, or lexer, popup a message for the user asking for a new name


// add a gitignore, and build releases
// add a dcoumentation on how to add a lexer, and publish :)






lets think of a better way to refactor it before rushing with code
one final UX i can feel good about, and continue from there.

lets make this document describe the ux and the emplimintatiob behind it
i will start by desiding how i want the ux to be, and then solve around that.

there should be a palletes menu
from there one should be able to go on to:

|- default
|- global1
|- global2
|- add theme
|-- lexer1
    | --- pallete
    | --- pallete
    | --- add theme
|-- lexer2
    | --- pallete
    | --- pallete
    | --- add theme

each theme should have a menu of all colours
an option to add a colour
for each colour an option to copy it, and then select to which pallete to move it
have an option to export the pallete