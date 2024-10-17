# Using callAsync/evalAsync

Currently, processing HTTP requests in async mode fails due to the following error:

```
Causes:
NoMethodError (undefined method `empty?' for nil)

/bundle/gems/actionview-7.2.1/lib/action_view/template/handlers/erb/erubi.rb:31:in `add_text'
/bundle/gems/erubi-1.13.0/lib/erubi.rb:167:in `block in initialize'
/bundle/gems/erubi-1.13.0/lib/erubi.rb:134:in `scan'
/bundle/gems/erubi-1.13.0/lib/erubi.rb:134:in `initialize'
/bundle/gems/actionview-7.2.1/lib/action_view/template/handlers/erb/erubi.rb:26:in `initialize'
/bundle/gems/actionview-7.2.1/lib/action_view/template/handlers/erb.rb:89:in `new'
/bundle/gems/actionview-7.2.1/lib/action_view/template/handlers/erb.rb:89:in `call'
/bundle/gems/actionview-7.2.1/lib/action_view/template.rb:437:in `compiled_source'
/bundle/gems/actionview-7.2.1/lib/action_view/template.rb:493:in `compile'
```

There is no such error in sync mode (see `main` branch).

What we've tried and what helped (and not):

- Increasing Fiber stack size didn't help (`RUBY_FIBER_MACHINE_STACK_SIZE=${String(1024 * 1024 * 20)}`)

- Warming up template compilation in sync mode **did help** (we perform a mock `/` request during initialization, so the main page loads fine)

- Switching to Haml helps! Our `/todos/new` route is now served by Haml without any issues.

Thus, there is something special about Erubi that causes the issue...
