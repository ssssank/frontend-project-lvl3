install:
	npm install

build:
	rm -rf dist
	npx webpack

test:
	npm test

lint:
	npx eslint .

.PHONY: test