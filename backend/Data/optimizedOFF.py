import pandas as pd

chunks = []
for chunk in pd.read_csv(
    "C:/Users/matmo/Downloads/en.openfoodfacts.org.products.csv/en.openfoodfacts.org.products.csv",
    sep="\t",
    quoting=3,
    encoding="utf-8",
    usecols=["product_name", "brands"], 
    chunksize=100_000,
):
    chunks.append(chunk)

data = pd.concat(chunks, ignore_index=True)

print(data)