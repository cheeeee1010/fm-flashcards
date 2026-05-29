import docx
import json

doc = docx.Document('draft.docx')
cards = []
current_question = None
current_answer = []

for p in doc.paragraphs:
    text = p.text.strip()
    if not text:
        if current_question and current_answer:
            cards.append({
                "question": current_question,
                "answer": "<br>".join(current_answer)
            })
            current_question = None
            current_answer = []
    else:
        if current_question is None:
            current_question = text
        else:
            current_answer.append(text)

if current_question and current_answer:
    cards.append({
        "question": current_question,
        "answer": "<br>".join(current_answer)
    })

js_content = "const flashcards = " + json.dumps(cards, indent=2, ensure_ascii=False) + ";"
with open('data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)
