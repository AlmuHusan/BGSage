from transformers import AutoTokenizer, AutoModelForCausalLM
model_id = "second-state/All-MiniLM-L6-v2-Embedding-GGUF"
filename = "all-MiniLM-L6-v2-Q5_K_S.gguf"

tokenizer = AutoTokenizer.from_pretrained(model_id, gguf_file=filename)
model = AutoModelForCausalLM.from_pretrained(model_id, gguf_file=filename)
print("DONE")