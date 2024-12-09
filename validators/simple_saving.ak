use aiken/collection/list
// use aiken/crypto.{Blake2b_224, Hash, VerificationKey}
// use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
// use cardano/address
use cardano/transaction.{Transaction, placeholder}

pub type DepositType {
  owner: VerificationKeyHash,
}

pub type WithDrawType {
  amount: Int,
}

fn must_be_signed_by(
  signer: VerificationKeyHash,
  signatories: List<VerificationKeyHash>,
) -> Bool {
  list.has(signatories, signer)
}

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

test spend_bad_keyhash() fail {
  let redeemer: WithDrawType = WithDrawType { amount: 2_000_000 }
  let owner_pkh = "Owner keyhash"
  let adversary_pkh = "Adversary keyhash"

  let datum: DepositType = DepositType { owner: owner_pkh }

  let adversary_tx: Transaction =
    Transaction { ..placeholder, extra_signatories: [adversary_pkh] }
  expect testvalidator.spend(Some(datum), redeemer, 0, adversary_tx)
}

test spend_correct_keyhash() {
  let redeemer: WithDrawType = WithDrawType { amount: 6_000_000 }
  let owner_pkh = "Owner keyhash"

  let datum: DepositType = DepositType { owner: owner_pkh }

  let owner_tx: Transaction =
    Transaction { ..placeholder, extra_signatories: [owner_pkh] }
  testvalidator.spend(Some(datum), redeemer, 0, owner_tx)
}

test spend_bad_redeemer_amount() fail {
  let redeemer: WithDrawType = WithDrawType { amount: 4_000_000 }
  let owner_pkh = "Owner keyhash"

  let datum: DepositType = DepositType { owner: owner_pkh }

  let owner_tx: Transaction =
    Transaction { ..placeholder, extra_signatories: [owner_pkh] }
  testvalidator.spend(Some(datum), redeemer, 0, owner_tx)
}
