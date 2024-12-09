import { Effect, pipe } from "effect";
import {Data,  Address, Emulator, Lucid,   SpendingValidator, validatorToRewardAddress, PrivateKey, UTxO, LucidEvolution, Network,  Constr, fromText, RedeemerBuilder } from "@lucid-evolution/lucid";
import {toPublicKey, getAddressDetails, applyDoubleCborEncoding, applyParamsToScript, validatorToAddress} from '@lucid-evolution/utils'
import { LucidContext, generateAccountPrivateKey, generateAccountSeedPhrase } from "../utils.js";

import { describe, it, afterEach, beforeEach, vi, expect,test  } from 'vitest';
import scripts from "../../plutus.json";
export const TIMEOUT = 120_000;
const network:Network = "Custom"
// beforeEach(async(context)=>{
//   context.lucid = await Lucid.new(new Emulator([]));
// })



beforeEach<LucidContext>(async (context) => {
  
  const createUser = async () => {
    return await generateAccountSeedPhrase(null,{ lovelace: BigInt(100_000_000) });
  };
  context.users = {
    owner: await createUser(),
    adversary: await createUser(),
  };

  context.emulator = new Emulator([
    context.users.owner,
    context.users.adversary, //use this user profile for the unhappy test path, adversary setting marketplace fee to 0% without having the Beacon UTxO
  ]);

  context.lucid = await Lucid( context.emulator,network);
});



test<LucidContext>("Test - Simple", async ({
    lucid,
    users,
    emulator,
  }) => {
    
    lucid.selectWallet.fromSeed(users.owner.seedPhrase); 
    const ownerAddress = await lucid.wallet().address();
    let utxos = await lucid.wallet().getUtxos();
    console.log("Owner: ", ownerAddress)
    console.log("Owner UTXOs: ", utxos)
    expect("test").eq("test")
        
    const spendCBOR = scripts.validators.find(
      (v) => v.title === "simple_saving.testvalidator.spend",
    )
    const ownerAddressDetails = getAddressDetails(ownerAddress)
    const publicKeyHash = ownerAddressDetails.paymentCredential.hash

    console.log("Validator CBOR: ", spendCBOR )
    

    const appliedParam = applyParamsToScript(applyDoubleCborEncoding(spendCBOR.compiledCode), [
      publicKeyHash!,
    ]);

    const validator :SpendingValidator = {
      type : "PlutusV3",
      script: applyDoubleCborEncoding(appliedParam)
    }

    const contractAddress = validatorToAddress(network, validator);
    

    // Create Datum
    const CreateDatumSchema:any = Data.Object({
      creator: Data.Bytes(),
    });
    type CreateDatumType = Data.Static<typeof CreateDatumSchema>;
    const CreateDatumType = CreateDatumSchema as unknown as CreateDatumType

    // Submit first tx to the Cntract
    let tx = await lucid
    .newTx()
    .pay.ToAddressWithData(contractAddress,
      {
        kind: "inline", 
        value: Data.to(0n) // Data.to({owner: publicKeyHash }, CreateDatumType)
      },
      {"lovelace": BigInt(8_000_000)})
    .complete({localUPLCEval:false});

    let signedTx = await tx.sign.withWallet().complete()
    

    let txHash = await signedTx.submit();
    console.log("Contract Address: ", contractAddress);
    console.log("Tx Hash: ", txHash);
    emulator.awaitBlock(1);
    

    let contractUtxos = await lucid.utxosAt(contractAddress)
    utxos = await lucid.wallet().getUtxos();
    console.log("Contract utxos: ", contractUtxos)
    console.log("Owner balance: ", await lucid.wallet().getUtxos())

    emulator.awaitBlock(1);

    // Create Datum
    const SpendDatumSchema:any = Data.Object({
      amount: Data.Integer(),
    });
    type SpendDatumType = Data.Static<typeof SpendDatumSchema>;
    const SpendDatumType = SpendDatumSchema as unknown as SpendDatumType
 
    
    console.log("Submitting Spend transaction")
    tx = await lucid
      .newTx()
      .collectFrom(contractUtxos,Data.to(new Constr(0, [fromText("Hello, World!")])))
      .attach.SpendingValidator(validator)
      // .pay.ToAddress(ownerAddress, {lovelace: 8000000n})
      // .collectFrom(contractUtxos, Data.to({
      //   amount: 0n
      // },SpendDatumType))
      .addSigner(ownerAddress)
      .complete({localUPLCEval : false});

      signedTx = await tx.sign.withWallet().complete()

      txHash = await signedTx.submit();
      console.log("Contract Address: ", contractAddress);
      console.log("Tx Hash: ", txHash);
      emulator.awaitBlock(1);

      contractUtxos = await lucid.utxosAt(contractAddress)
      console.log("Address utxos: ", contractUtxos)
      console.log("Owner balance: ", await lucid.wallet().getUtxos())
      
    // }catch(e){
    //   console.log("Error: ", JSON.stringify(e,null,0))
    // }
    
    

    


}, TIMEOUT); // Increased timeout to 120 seconds
