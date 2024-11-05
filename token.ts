import { web3 } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

export const createCrdToken = async (
  connection: web3.Connection,
  owner: web3.Keypair
): Promise<web3.PublicKey> => {
  const crdMint = await createMint(
    connection,
    owner,
    owner.publicKey,
    owner.publicKey,
    9
  );

  return crdMint;
};

export const mintTokenTo = async (
  connection: web3.Connection,
  owner: web3.Keypair,
  reciever: web3.Keypair,
  mintAddress: web3.PublicKey
) => {
  const destination = await getAssociatedTokenAddress(
    mintAddress,
    reciever.publicKey
  );
  const ataIx = createAssociatedTokenAccountInstruction(
    owner.publicKey,
    destination,
    reciever.publicKey,
    mintAddress
  );

  const mintToIx = createMintToInstruction(
    mintAddress,
    destination,
    owner.publicKey,
    1000000 * web3.LAMPORTS_PER_SOL
  );
  const transaction = new web3.Transaction().add(ataIx, mintToIx);
  const txn = await web3.sendAndConfirmTransaction(connection, transaction, [
    owner,
  ]);
  return destination;
};

export const mintTokenToAta = async (
  connection: web3.Connection,
  owner: web3.Keypair,
  reciever: web3.PublicKey,
  mintAddress: web3.PublicKey
) => {
  const mintToIx = createMintToInstruction(
    mintAddress,
    reciever,
    owner.publicKey,
    100 * web3.LAMPORTS_PER_SOL
  );
  const transaction = new web3.Transaction().add(mintToIx);
  const txn = await web3.sendAndConfirmTransaction(connection, transaction, [
    owner,
  ]);
};
