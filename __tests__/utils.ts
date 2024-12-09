import {
  Lucid,
  LucidEvolution,
  Emulator,
  generateSeedPhrase,
  UTxO as LUTxO,
  Assets as LAssets,
  generatePrivateKey,
  PrivateKey,
} from "@lucid-evolution/lucid";

export const TIMEOUT = 120_000;


export type UserWallets = {
  owner?: UserWallet
  adversary?: UserWallet
}

export type UserWallet = {
  seedPhrase?: string
  privateKey?: string
  address: string
  assets: any
}

export type LucidContext = {
  lucid: LucidEvolution;
  users: UserWallets;
  privateKey?: PrivateKey;
  emulator: Emulator;
};

export const unsafeHexToUint8Array = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

export function getUtxoWithAssets(utxos: LUTxO[], minAssets: LAssets): LUTxO[] {
  const utxo = utxos.find((utxo) => {
    for (const [unit, value] of Object.entries(minAssets)) {
      if (!Object.hasOwn(utxo.assets, unit) || utxo.assets[unit] < value) {
        return false;
      }
    }
    return true;
  });

  if (!utxo) {
    throw new Error(
      "No UTxO found containing assets: " +
        JSON.stringify(minAssets, bigIntReplacer)
    );
  }
  return [utxo];
}

export function bigIntReplacer(_k: any, v: any) {
  return typeof v === "bigint" ? v.toString() : v;
}



export const generateAccountSeedPhrase = async (provider, assets: LAssets) => {
  const seedPhrase = generateSeedPhrase();
  
  let lucid;
  if(!provider){
    lucid = await Lucid( new Emulator([]), 'Custom')
  }else{
    lucid = await Lucid(provider, 'Preview')
  }
  lucid.selectWallet.fromSeed(seedPhrase);
  return {
    seedPhrase,
    address: await lucid.wallet().address(),
    assets,
  };
};

export const generateAccountPrivateKey = async (assets: LAssets) => {
  const privateKey = generatePrivateKey();
  const lucid =  await Lucid(new Emulator([]),'Custom')
  lucid.selectWallet.fromPrivateKey(privateKey);
  return {
    privateKey,
    address: await lucid.wallet().address(),
    assets,
  };
};

export function generate56CharHex(): string {
  const bytes: number = 28; // 28 bytes * 2 hex chars per byte = 56 characters
  const result: string[] = [];

  for (let i = 0; i < bytes; i++) {
    // Generate a random number between 0 and 255 (1 byte)
    const randomByte: number = Math.floor(Math.random() * 256);
    // Convert to hexadecimal and pad with zero if necessary
    result.push(randomByte.toString(16).padStart(2, "0"));
  }

  return result.join("");
}

export function generateRandomTokenName(): Uint8Array {
  const bytes: number = Math.floor(Math.random() * 32);
  const result = new Uint8Array(bytes);

  for (let i = 0; i < bytes; i++) {
    result[i] = Math.floor(Math.random() * 256);
  }

  return result;
}
