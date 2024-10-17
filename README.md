# Rails on Wasm playground application

This is a sample application to showcase different Rails on Wasm techniques.

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
