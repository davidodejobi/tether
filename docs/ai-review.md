# AI explanation review (roadmap 9a)

Model: `google/gemini-3.5-flash-lite`. Generated 2026-10-14 with `node tools/ai-sample.ts`, using the same prompt builder and output checker as `functions/api/explain.ts`.

The checker verdict is automatic and only filters; it is not a review. A human fills the last column for each row: does the text
(1) restate only the reviewed Move 1 rule (no new grammar rules), (2) give no answer, option choice or grading, and (3) read simply in at most three sentences?

| # | Style | Output | Checker | Reviewer verdict |
|---|---|---|---|---|
| 1 | plain | Phrases like as well as, along with, together with, and in addition to only add extra people. They never change the true subject of your sentence. Cover the side phrase with your hand, read only what is left, and match the verb to that remaining word. | accepted | |
| 2 | plain | Words like along with or together with just add extra people to the sentence. They never change the main subject. Cover the side phrase with your hand, read what is left, and match the verb to that word. | accepted | |
| 3 | plain | Some phrases only add extra people and never change the subject. Cover the side phrase with your hand. Read what is left to find the real subject, and then match the verb to it. | accepted | |
| 4 | plain | When you see extra phrases like as well as or along with, remember they only add extra people. They never change the true subject. Cover the side phrase, read what is left, and match the verb to it. | accepted | |
| 5 | plain | When phrases like as well as or together with show up, they only add extra people. They never change the real subject. Cover that side phrase, read what is left, and match the verb to it. | accepted | |
| 6 | plain | Phrases like as well as, along with, together with, and in addition to only add extra people. They never change the subject. Cover that side phrase, read what is left, and match the verb to it. | accepted | |
| 7 | plain | Words like as well as, along with, together with, and in addition to only add extra people. They never change the subject. Cover the side phrase, read what is left, and match the verb to it. | accepted | |
| 8 | plain | Words like as well as, along with, together with, and in addition to only add extra people. They never change the true subject. Cover the side phrase with your hand, read what is left, and match the verb to that remaining word. | accepted | |
| 9 | plain | Phrases like as well as, along with, together with and in addition to only bring extra people along. They never change who the true subject is. Just cover up that side phrase, read what is left behind, and match the verb to that leftover part. | accepted | |
| 10 | plain | Words like along with or together with only add extra people. They never change the true subject of your sentence. Cover that side phrase with your hand, read what is left, and match the verb to it. | accepted | |
| 11 | analogy | Think of the extra people like a dog wearing a funny costume sitting next to you on the bus. Cover the side phrase so you ignore the disguise completely. Read what is left to see who the real passenger is and match the verb to that true person. | accepted | |
| 12 | analogy | Think of extra people joining a group like wearing a heavy winter jacket. Even though your jacket makes you look bigger, your actual body size underneath never changes. Cover that side phrase with your hand, read what is left, and match the verb to it. | accepted | |
| 13 | analogy | Think of the main person as the driver of a car. Words like along with and together with just put extra passengers in the back seat. Cover the side phrase with your hand, read what is left, and match the verb to the driver. | accepted | |
| 14 | analogy | Think of extra words like a passenger wearing a heavy disguise inside a car. That passenger does not change who is driving the vehicle. Cover the side phrase, read what is left, and match the verb. | accepted | |
| 15 | analogy | Think of a person holding a large umbrella. The umbrella is extra and sits on the side, but the person is the one who actually walks forward. Cover the side phrase, read what is left, and match the verb. | accepted | |
| 16 | analogy | Think of a heavy winter coat hiding your real clothes underneath. Words like along with and together with are just that heavy coat. Cover the side phrase, read what is left, and match the verb to it. | accepted | |
| 17 | analogy | Think of those extra words like a passenger sitting in the back seat of a car. They do not drive the car or change who is behind the wheel. Cover that side phrase, read what is left, and match the verb to it. | accepted | |
| 18 | analogy | Think of those extra words like a passenger sitting in the back seat of a car. They do not drive or steer the vehicle at all. Cover that side phrase, read what is left, and match the verb to the main driver. | accepted | |
| 19 | analogy | Think of the extra people like a shopping bag you hold while walking. The bag goes with you, but only you are doing the walking. Cover that side phrase, read what is left, and match the verb to it. | accepted | |
| 20 | analogy | Think of those extra words like a passenger sitting in the back seat of a car. They do not drive or steer the vehicle. Cover that side phrase with your hand, read what is left, and match the verb to the driver. | accepted | |

## Observed limitations

To be written by the reviewer after reading the rows.
