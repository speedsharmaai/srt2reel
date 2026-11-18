# Examples

Test inputs for the skill, in four languages. Each folder has the text (`lines.txt`), a voice made from it (`voice.mp3`) and the matching `voice.srt`.

| Folder | Language | Voice |
|---|---|---|
| `en` | English | macOS Samantha |
| `hi` | Hindi | macOS Lekha |
| `ar` | Arabic | macOS Majed |
| `ja` | Japanese | macOS Kyoko |

The stories were written for this repository. The voices come from the macOS `say` command:

```
node examples/make-example.ts examples/en/lines.txt Samantha examples/en
```

`en/story.json` and `en/scenes.tsx` are the finished English example: eleven scenes drawn for that story. `long/scenes.tsx` is the set of reusable landscape scenes used for the long-render tests.

Projects built from these inputs (`*/project`) are not kept in the repository.
