FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3.10 python3-pip git wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8188 8000

CMD sh -c "python3 -u main.py --listen 0.0.0.0 --port 8188 & uvicorn api:app --host 0.0.0.0 --port 8000"
