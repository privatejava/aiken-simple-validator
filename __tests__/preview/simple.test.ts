import { Effect, pipe } from "effect";
import {Data,  Address, Emulator, Lucid,   SpendingValidator, validatorToRewardAddress, PrivateKey, UTxO, LucidEvolution, Network,  Constr, fromText, RedeemerBuilder, Blockfrost } from "@lucid-evolution/lucid";
import {toPublicKey, getAddressDetails, applyDoubleCborEncoding, applyParamsToScript, validatorToAddress} from '@lucid-evolution/utils'
import { LucidContext, UserWallet} from "../utils.js";

import { describe, it, afterEach, beforeEach, vi, expect,test, assert  } from 'vitest';
import scripts from "../../plutus.json";
import { setTimeout } from "timers/promises";
export const TIMEOUT = 120_000;
const network:Network = "Custom"
// beforeEach(async(context)=>{
//   context.lucid = await Lucid.new(new Emulator([]));
// })




beforeEach<LucidContext>(async (context) => {
  const provider = new Blockfrost("https://cardano-preview.blockfrost.io/api/v0",process.env.BLOCKFROST_API_KEY)
  
  const lucid = await Lucid(provider, 'Preview')
  
  lucid.selectWallet.fromSeed(process.env.OWNER_WALLET_SEED)
  const owner = <UserWallet>{
    seedPhrase : process.env.OWNER_WALLET_SEED,
    address: await lucid.wallet().address(),    
  }

  lucid.selectWallet.fromSeed(process.env.ADVERSARY_WALLET_SEED)
  const adversary = <UserWallet>{
    seedPhrase : process.env.ADVERSARY_WALLET_SEED,
    address: await lucid.wallet().address(),    
  }
  
  await lucid.wallet().address(),
  context.users = {
    owner,
    adversary,
  };

  context.lucid = await Lucid( provider,network);
});

async function getContract(name: string, defaultDatum=undefined){
  
  const spendCBOR = scripts.validators.find(
    (v) => v.title === name // "simple_saving.testvalidator.spend",
  )

  if(defaultDatum == undefined){
    return <SpendingValidator>{
      type : "PlutusV3",
      script: applyDoubleCborEncoding(spendCBOR.compiledCode)
    }
  }
  const appliedParam = applyParamsToScript(applyDoubleCborEncoding(spendCBOR.compiledCode), defaultDatum);

  const validator :SpendingValidator = {
    type : "PlutusV3",
    script: applyDoubleCborEncoding(appliedParam)
  }

  return validator;

}

async function printUTXO(lucid:LucidEvolution, wallet:UserWallet){
  lucid.selectWallet.fromSeed(wallet.seedPhrase)
  const utxos = await lucid.wallet().getUtxos()
  console.log("Address: ", await lucid.wallet().address())
  console.log("UTXOs: ", utxos)
}


async function spendContract(lucid:LucidEvolution, owner:UserWallet, adversary:UserWallet){
  lucid.selectWallet.fromSeed(owner.seedPhrase)
  // const _ownerAddressDetails = getAddressDetails(owner.address)
  // const publicKeyHash = _ownerAddressDetails.paymentCredential.hash
  // const validator =  await getContract("simple_saving.testvalidator.spend", [publicKeyHash!])
  const validator =  await getContract("simple_saving.testvalidator.spend")

  
  const SpendDatumSchema:any = Data.Object({
    amount: Data.Integer(),
  });
  type SpendDatumType = Data.Static<typeof SpendDatumSchema>;
  const SpendDatumType = SpendDatumSchema as unknown as SpendDatumType
  
  const contractAddress = validatorToAddress(network, validator);
  console.log("Contract Address: ", contractAddress)
  const contractUtxos = await lucid.utxosAt(contractAddress)
  console.log("Contract UTXOs: ", contractUtxos)

  
  await expect(async () =>{
    console.log("Testing with adversary wallet + 5000000 lovelaces ")
    try {
      lucid.selectWallet.fromSeed(adversary.seedPhrase)
      const addressDetails = getAddressDetails(adversary.address)
      console.log("Wallet:", addressDetails.address.bech32)
      console.log("Key Hash:", addressDetails.paymentCredential.hash)
      const tx = await lucid.newTx()
        .collectFrom(contractUtxos, Data.to({
            amount: 5_000_000n
          },SpendDatumType))
        .attach.SpendingValidator(validator)
        .pay.ToAddress(adversary.address, {lovelace: 6000000n})        
        .addSigner(adversary.address)
      .complete({changeAddress: adversary.address});
      let signedTx = await tx.sign.withWallet().complete()
  
      let txHash = await signedTx.submit();
      console.log("Contract Tx Hash : ", txHash)
    }catch(e){
      // console.log("Error: ", e)
      throw new Error(`Error: ${e}`)
    }
  }).rejects.toThrowError(/Error/)


  //Test with owner wallet
  await expect(async () =>{
    console.log("Testing with user wallet + 0 lovelaces ")
    try {
      lucid.selectWallet.fromSeed(adversary.seedPhrase)
      // const adversaryAddressDetails = getAddressDetails(adversary.address)
      
      lucid.selectWallet.fromSeed(owner.seedPhrase)
      const ownerAddressDetails = getAddressDetails(owner.address)
      console.log("Wallet:", ownerAddressDetails.address.bech32)
      console.log("Key Hash:", ownerAddressDetails.paymentCredential.hash)
      const tx = await lucid.newTx()
        .collectFrom(contractUtxos, Data.to({
              amount: 0n
          },SpendDatumType))
        .attach.SpendingValidator(validator)
        .pay.ToAddress(owner.address, {lovelace: 6000000n})        
        .addSigner(owner.address)
      .complete({ localUPLCEval: false, changeAddress: owner.address});
      let signedTx = await tx.sign.withWallet().complete()
      lucid.selectWallet.fromSeed(adversary.seedPhrase)
      signedTx = await tx.sign.withWallet().complete()
      let txHash = await signedTx.submit();
      console.log("Contract Tx Hash : ", txHash)
      return "ok"
    }catch(e){
      // console.log("Error: ", e)
      throw new Error(`Error: ${e}`)
    }
  }).rejects.toThrowError(/Error/)

  //Test with owner wallet and  5_000_000 amount
  await expect((async ()=>{
    try {
      console.log("Testing with user wallet + 5000000 lovelaces ")
      lucid.selectWallet.fromSeed(adversary.seedPhrase)
      // const adversaryAddressDetails = getAddressDetails(adversary.address)
      
      lucid.selectWallet.fromSeed(owner.seedPhrase)
      const ownerAddressDetails = getAddressDetails(owner.address)
      console.log("Wallet:", ownerAddressDetails.address.bech32)
      console.log("Key Hash:", ownerAddressDetails.paymentCredential.hash)
      const tx = await lucid.newTx()
        .collectFrom(contractUtxos, Data.to({
              amount: 5_000_000n
          },SpendDatumType))
        .attach.SpendingValidator(validator)
        .pay.ToAddress(owner.address, {lovelace: 6000000n})        
        .addSigner(owner.address)
      .complete({ localUPLCEval: false, changeAddress: owner.address});
      let signedTx = await tx.sign.withWallet().complete()
      lucid.selectWallet.fromSeed(adversary.seedPhrase)
      signedTx = await tx.sign.withWallet().complete()
      let txHash = await signedTx.submit();
      console.log("Contract Tx Hash : ", txHash)
      return "ok"
    }catch(e){
      console.log("Error: ", e)
      throw new Error(`Error: ${e}`)
    }
  })()).resolves.toBe("ok")
  
    
  
    

}

async function createContract(lucid:LucidEvolution, wallet:UserWallet){

  lucid.selectWallet.fromSeed(wallet.seedPhrase)
  const ownerAddressDetails = getAddressDetails(wallet.address)
  const publicKeyHash = ownerAddressDetails.paymentCredential.hash
  // const validator =  await getContract("simple_saving.testvalidator.spend", [publicKeyHash!])
  const validator =  await getContract("simple_saving.testvalidator.spend")
  
  const contractAddress = validatorToAddress(network, validator);
  console.log("Contract Address: ", contractAddress)

  const CreateDatumSchema:any = Data.Object({
    owner: Data.Bytes(),
  });
  type CreateDatumType = Data.Static<typeof CreateDatumSchema>;
  const CreateDatumType = CreateDatumSchema as unknown as CreateDatumType
  
  console.log("Address: ",await lucid.wallet().address())

  const tx = await lucid.newTx()
    .pay.ToContract(contractAddress, {kind:"inline", value: Data.to({owner: publicKeyHash }, CreateDatumType)}, { lovelace: 6000000n })
    .complete({changeAddress: wallet.address});

  let signedTx = await tx.sign.withWallet().complete()
  
  let txHash = await signedTx.submit();
  console.log("Contract Tx Hash : ", txHash)
  return {address: contractAddress, validator, txHash}
}

test<LucidContext>("Test - Simple", async ({
    lucid,
    users,
    emulator,
  }) => {
  
    console.log(`User Address: ${users.owner.address}`)
    console.log(`Adversary Address: ${users.adversary.address}`)

    await printUTXO(lucid,users.owner)
    await printUTXO(lucid,users.adversary)
    

    await createContract(lucid, users.owner)
    await setTimeout(60000)
    await spendContract(lucid,users.owner, users.adversary)


}, TIMEOUT); // Increased timeout to 120 seconds
