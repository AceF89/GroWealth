import { web3 } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";

export const sendVersionedTransactionWithComputeUnits = async (
    provider: anchor.AnchorProvider,
    instruction: web3.TransactionInstruction[],
    signers: web3.Signer[],

) => {
    let messageV0 = new web3.TransactionMessage({
        payerKey: provider.wallet.publicKey,
        instructions: [...instruction],
        recentBlockhash: await provider.connection.getLatestBlockhash('confirmed').then(data => data.blockhash)
      }).compileToV0Message();

      const simTransaction = new web3.VersionedTransaction(messageV0);
      simTransaction.sign(signers);
      const transaction = web3.VersionedTransaction.deserialize(
        simTransaction.serialize(),
      );

      const simulation =
      await provider.connection.simulateTransaction(transaction, {
        sigVerify: false,
      });
      
      const unitLimit = !simulation.value.err ? simulation?.value?.unitsConsumed * 1.1 || 400_000 : 4_00_000;

      const LIMIT_FEE_IX = web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: unitLimit,
      });

      const PRIORITY_FEE_IX = web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000000,
      });


      messageV0 = new web3.TransactionMessage({
        payerKey: provider.wallet.publicKey,
        instructions: [LIMIT_FEE_IX,PRIORITY_FEE_IX,...instruction],
        recentBlockhash: await provider.connection.getLatestBlockhash('confirmed').then(data => data.blockhash)
      }).compileToV0Message();

      const txn = new web3.VersionedTransaction(messageV0);
      txn.sign(signers);

      const t = await provider.sendAndConfirm(txn);
      console.log('🚀 Transaction hash:', t);
      return t;
}

export const wait = async (delayinms) =>  new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(true);
  }, delayinms)
})