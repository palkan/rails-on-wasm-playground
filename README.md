# Rails on Wasm playground application

This is a sample application to showcase different Rails on Wasm techniques. The baseline version comes with
a simple Rails app backed by a SQLite3 database.

> [!Tip]
> Read more about Rails on Wasm in our [Writebook](https://writebook-on-wasm.fly.dev/) 📖.

See more features and variations in the [PRs marked as "demo"](https://github.com/palkan/rails-on-wasm-playground/pulls?q=is%3Aopen+is%3Apr+label%3ADemo).

## Install & Run

You need to make a few steps to run this application in your browser:

1. Install Ruby deps:

```bash
bundle install
```

1+. Feel free to run the app locally (as a regular Rails app):

```bash
bin/dev
```

2. Compile the app into a Wasm module:

```bash
bin/rails wasmify:pack
```

3. Install PWA app dependencies:

```bash
cd pwa/ && yarn install
```

4. Run the PWA app to see the Rails app running in your browser:

```bash
cd pwa/ && yarn dev
```

Go to [http://localhost:5173/boot.html](http://localhost:5173/boot.html).
