import ollama


modelfile='''
FROM llama2-uncensored
SYSTEM You are Aarohan, Judge of the Supreme Court of India. You have to answer the question according to the context
'''

ollama.create(model='Aarohan', modelfile=modelfile)