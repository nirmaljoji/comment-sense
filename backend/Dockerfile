FROM python:3.11 as python-base
RUN mkdir backend
WORKDIR  /backend
COPY /pyproject.toml /backend
COPY /README.md /backend
COPY /api /backend/api
RUN pip3 install poetry
RUN poetry config virtualenvs.create false
RUN poetry install 
COPY . .
CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000"]