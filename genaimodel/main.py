import ollama
import json

from langchain_community.embeddings import OllamaEmbeddings
from langchain.vectorstores.chroma import Chroma
from flask import Flask, request, jsonify   
embd=OllamaEmbeddings(model="Aarohan")
CHROMA_PATH="constitution"
messages=[

  
]
# messages=json.load(open("chatdb.json"))["default"]["messages"]
# save=False
# save= True if input("Do you want to save the conversation? (y/n): ").lower()=="y" else False
# print("You are saving the conversation") if save else print("You are not saving the conversation")
# session_id = ""
# if save:
#     session_id = input("Enter the session id: ")
def get_contextText(query_text):
    
    db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embd)

    # Search the DB.
    results = db.similarity_search_with_relevance_scores(query_text, k=6)
    # if len(results) == 0 or results[0][1] < 0.7:
    #     # print(f"Unable to find matching results.")
    #     return ""

    context_text = "\n\n---\n\n".join([doc.page_content for doc, _score in results])
    refrence_text = []
    for doc, _score in results:
        refrence_text.append(doc.metadata)
    print(refrence_text)
    return (context_text,refrence_text)

app=Flask(__name__)
@app.route("/chat",methods=["POST"])
def chat():
    global messages
    data=request.json
    user_input=data["mess"]
    user_input= user_input if user_input else "continue"
    # if user_input.lower() == "[exit]":
    #     return jsonify({"response":"exit"})
    context=get_contextText(user_input) if user_input!="continue"  else ""
    if context[0]=="":
        context=["No context found"]
    
    response = ollama.chat(model="Aarohan", messages=[
        
            {"role": "system", "content": "Read the lawyer 1 and lawyer 2 statements and pass judgment."},
           
        {
            'role': 'user',
            'content': f"""you have to answer the question according to the context
            -------
            # {context[0]}
            -------
            The convercation is : {user_input}
            
        
            ```here all context is part of constitution```
            
            ```mention the lawyer 1 and lawyer 2 statements and pass judgement according to the article of constitution and mention the article number```
            JUDGE: 
            """,
        }
        ],stream=False)
    return jsonify({"response":response["message"]['content'], "context":[context[0].split("\n\n---\n\n"),context[1]]})
    
    aimes=""
    # for message in response:
    #     aimes+=message["message"]['content']
    # messages.append(
    #     {
    #         'role': 'assistant',
    #         'content': aimes,
    #     }
    # )
    # return jsonify({"response":aimes})

if __name__=="__main__":
    # try:
    #     while True:
    #         user_input =  input("You: ")
    #         user_input= user_input if user_input else "continue"
    #         if user_input.lower() == "[exit]":
    #             break
    #         context=get_contextText(user_input)
    #         if context=="":
    #             context="No context found"
    #         """"""
    #         messages.append(
    #             {
    #                 'role': 'user',
    #                 'content': f"""you have to answer the question according to the context
    #                 -------
    #                 # {context}
    #                 -------
    #                 The question is: {user_input}
                    
                    
    #                 ```here all context is part of constitution```
    #                 """,
    #             }
    #         )
    #         aimes=""
    #         response = ollama.chat(model="Aarohan", messages=messages,stream=True)

    #         print("Aarohan: ",end="")
            
    #         for message in response:
    #             print(message["message"]['content'],end="",flush=True)
    #             aimes+=message["message"]['content']
    #         messages.append(
    #             {
    #                 'role': 'assistant',
    #                 'content': aimes,
    #             }
    #         )
    #         print("\n"*5)
    #         print(context)
    #         print()
    # finally:
    #     pass
    app.run(port=5000,debug=True)

