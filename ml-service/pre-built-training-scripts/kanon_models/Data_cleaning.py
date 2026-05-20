import pandas as pd
import numpy as np

df = pd.ExcelFile(
    "record-mfs2-2026-03-13-04-32-17 Lions mane c2000-Studio3.xlsx"
)
#print(df.sheet_names)

time_series_data = pd.read_excel("record-mfs2-2026-03-13-04-32-17 Lions mane c2000-Studio3.xlsx", sheet_name='record-mfs2-2026-03-13-04-32-17')
#print(time_series_data.head(10))

#print(time_series_data.head())      
#print(time_series_data.info())      
#print(time_series_data.shape)       
#print(time_series_data.columns)

#print(time_series_data["Time"].head())
time_series_data["Time"] = pd.to_datetime(time_series_data["Time"])
time_series_data = time_series_data.set_index("Time")

#print(time_series_data.isna().sum())
#print(time_series_data.describe())


normalised_data = pd.read_excel("record-mfs2-2026-03-13-04-32-17 Lions mane c2000-Studio3.xlsx", sheet_name='Normalized data')
#print(normalised_data.head())       
#print(normalised_data.info())       
#print(normalised_data.columns) 
n5616 = normalised_data[["index", "time (from start)", "N5616 Trace1","N5616 Trace2","N5616 Trace3","N5616 Trace4"]].copy()
print(n5616.head())

print(n5616.info()) 
print(n5616.isna().sum())

d21 = normalised_data[["index", "Min index row", "max index row", "D21 Trace1","D21 Trace2","D21 Trace3","D21 Trace4"]].copy()
print(d21.head())
print(d21.isna().sum())




