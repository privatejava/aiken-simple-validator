# Aiken Sample Project

Write validators in the `validators` folder, and supporting functions in the `lib` folder using `.ak` as a file extension.

```aiken
validator testvalidator {
  //Apply a simple deposit with some checking if deposit contains ADA valued more than 5 
  spend(
    datum: Option<DepositType>,
    redeemer: WithDrawType,
    _output_ref: Data,
    tx: Transaction,
  ) {
    expect Some(datum) = datum
    expect must_be_signed_by(datum.owner, tx.extra_signatories) == True
    redeemer.amount >= 5_000_000
  }

  else(_) {
    fail @"Invalid Action!"
  }
}
```

## Building

```sh
aiken build
```

## Configuring

**aiken.toml**
```toml
[config.default]
network_id = 2
```

Or, alternatively, write conditional environment modules under `env`.

## Testing with Lucid in preview net

You need to create a _.env_ file using reference from [sample.env](sample.env). 
- Put seed phrase of both owner and adversary wallet `OWNER_WALLET_SEED`, `ADVERSARY_WALLET_SEED`
- add blockfrost api key for preview as well from `BLOCKFROST_API_KEY`

```bash
npm i
npm run test:preview
```

## Documentation

If you're writing a library, you might want to generate an HTML documentation for it.

Use:

```sh
aiken docs
```

## Resources

Find more on the [Aiken's user manual](https://aiken-lang.org).
