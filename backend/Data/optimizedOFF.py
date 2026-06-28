import pandas as pd
import sys

chunks = []
for chunk in pd.read_csv("C:/Users/matmo/OneDrive/Desktop/en.openfoodfacts.org.products.csv",
    sep="\t",
    quoting=3,
    on_bad_lines="skip",
    encoding="utf-8",
    dtype={"code": str}, 
    usecols=["code", "product_name", "generic_name", "brands", "quantity", "categories", "nova_group"],
    chunksize=100_000,
):
    chunk = chunk.dropna(subset=["code", "product_name", "brands"]) 
    chunks.append(chunk)

chunks.append(chunk.dropna(subset=["product_name"]))


data = pd.concat(chunks, ignore_index=True)
# Memory usage
memory_bytes = data.memory_usage(deep=True).sum()
memory_mb = memory_bytes / (1024 ** 2)
memory_gb = memory_bytes / (1024 ** 3)

print(f"Rows:    {len(data):,}")
print(f"Columns: {len(data.columns)}")
print(f"Memory:  {memory_mb:.1f} MB  ({memory_gb:.2f} GB)")
