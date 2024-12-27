import { web3 } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

class TokenClass {
  createToken = async (
    connection: web3.Connection,
    owner: web3.Keypair
  ): Promise<web3.PublicKey> => {
    const crdMint = await createMint(
      connection,
      owner,
      owner.publicKey,
      owner.publicKey,
      9,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log("111111111111111111111111111111");

    return crdMint;
  };

  mintTokenTo = async (
    connection: web3.Connection,
    owner: web3.Keypair,
    reciever: web3.Keypair,
    mintAddress: web3.PublicKey
  ) => {
    // const destination = await getAssociatedTokenAddress(
    //   mintAddress,
    //   reciever.publicKey
    // );
    try {
      const destination = await getAssociatedTokenAddress(
        mintAddress,
        reciever.publicKey,
        false, // Optional boolean, true if the associated token account should be owned by a program
        TOKEN_2022_PROGRAM_ID // Use Token 2022 program ID here
      );
      const ataIx = createAssociatedTokenAccountInstruction(
        owner.publicKey,
        destination,
        reciever.publicKey,
        mintAddress,
        TOKEN_2022_PROGRAM_ID
      );

      const mintToIx = createMintToInstruction(
        mintAddress,
        destination,
        owner.publicKey,
        1000 * web3.LAMPORTS_PER_SOL,
        [],
        TOKEN_2022_PROGRAM_ID
      );
      const transaction = new web3.Transaction().add(ataIx, mintToIx);
      const txn = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [owner]
      );

      return destination;
    } catch (err) {
      console.log("error in mint :", err);
      throw err;
    }
  };

  mintTokenToAta = async (
    connection: web3.Connection,
    owner: web3.Keypair,
    reciever: web3.PublicKey,
    mintAddress: web3.PublicKey
  ) => {
    const mintToIx = createMintToInstruction(
      mintAddress,
      reciever,
      owner.publicKey,
      1000 * web3.LAMPORTS_PER_SOL
    );
    const transaction = new web3.Transaction().add(mintToIx);
    const txn = await web3.sendAndConfirmTransaction(connection, transaction, [
      owner,
    ]);
  };
}

export default new TokenClass();
