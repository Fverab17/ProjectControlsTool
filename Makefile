.PHONY: up down migrate seed test logs shell-db

up:
	docker compose up --build

down:
	docker compose down

migrate:
	docker compose exec backend alembic upgrade head

seed:
	docker compose exec backend python -m app.seed

test:
	docker compose exec backend pytest

logs:
	docker compose logs -f

shell-db:
	docker compose exec db psql -U cpm cpm_training
