import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PreSaleContact } from "../target/types/pre_sale_contact";
import { expect, assert } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createMintToInstruction,
  
} from "@solana/spl-token";
import {
  Connection,
  SystemProgram,
  PublicKey,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import BN from "bn.js";
import base58 from "bs58";

import TokenClass from "./spl-token";

describe("pre-sale-contact", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const program = anchor.workspace.PreSaleContact as Program<PreSaleContact>;
  console.log("======================>>>>>>>>>>>+",program.programId);

  const authority = Keypair.fromSecretKey(
    base58.decode(
      "3bnhkgJF7h73KmEmqgMA5AFNQtaPwbEb9iWH76LGmc9f4Ub8jaNkVT5VcuRQTenRXMitVU9YaYdkHofTdvjatE3"
    )
  );
  console.log("Authority Public Key:", authority.publicKey.toBase58());
  const newAccount = Keypair.generate();

  // const authority = Keypair.generate();
  // const [presaleAccountPDA] = PublicKey.findProgramAddressSync(
  //   [Buffer.from(anchor.utils.bytes.utf8.encode("Presale"))],
  //   program.programId
  // );

  // change this pda in  new contract 

  // const [creatorAccountPDA] = PublicKey.findProgramAddressSync(
  //   [Buffer.from(anchor.utils.bytes.utf8.encode("creator_seed"))],
  //   program.programId
  // );
  // console.log("Presale Account PDA:", presaleAccountPDA.toBase58());

  const [presaleProgramDataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("Presale")),
      Buffer.from(anchor.utils.bytes.utf8.encode("program_data")),
    ],
    program.programId
  );
  console.log("Presale Program Data PDA:", presaleProgramDataPda.toBase58());

  const startTime = Math.floor(new Date().getTime() / 1000) + 5 * 60;
  console.log("Start Time:", startTime);

  // Calculate end time by adding 86400 seconds (1 day) to the start time
  const endTime = startTime + 5 * 60;
  console.log("End Time:", endTime);

  let tokenMint: PublicKey;
  let presaleTokenAta: PublicKey;
  let adminTokenAta: PublicKey;

  async function airdrop(receiver: PublicKey) {
    console.log("Airdropping SOL to:", receiver.toBase58());
    const airdropSignature = await connection.requestAirdrop(
      receiver,
      5 * LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: airdropSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

   const balance = await connection.getBalance(receiver);
   console.log("Airdrop successful:", airdropSignature);
   console.log("Receiver's Balance:", balance);
  }

  it("Iniitialize the pre-sale contract", async () => {
    // await airdrop(authority.publicKey);
    // await airdrop(newAccount.publicKey);

    // tokenMint = await TokenClass.createToken(connection, authority);
    // console.log("Token Mint Address:", tokenMint.toBase58());

    tokenMint = new PublicKey("6xt5DLMNjZCVYoLxifnKFngrvbWjkehy2AtbrLTZJroQ");
    try {
      const ix = await program.methods
        .initialize({ tokenMint })
        .accounts({
          authority: authority.publicKey,
          // presaleProgramData:presaleProgramDataPda,
          tokenMint,
        })
        .instruction();

      const tx = new Transaction();
      tx.add(ix);

      // const signature = await sendAndConfirmTransaction(connection, tx, [
      //   authority,
      // ]);
      // console.log("Initialization Transaction Signature:", signature);

      // const presaleProgramData = await program.account.presaleProgramData.fetch(
      //   presaleProgramDataPda
      // );
      // // console.log("Fetched Presale Program Data:", presaleProgramData);

      // expect(presaleProgramData.tokenMint.toBase58()).to.equal(
      //   tokenMint.toBase58()
      // );
    } catch (error) {
      console.log("Error during presale initialization:", error);
      throw error;
    }
  });

  it("Grant access to the admin", async () => {
    try {
      console.log();

      const ix = await program.methods
        .grantAccess(authority.publicKey)
        .accounts({
          authority: authority.publicKey,
          creator: authority.publicKey,
        })
        .instruction();

      const tx = new Transaction();
      tx.add(ix);

      const signature = await sendAndConfirmTransaction(connection, tx, [
        authority,
        authority,
      ]);
      console.log("Grant access Transaction Signature:", signature);
    } catch (error) {
      console.log(error);
      throw error;
    }
  });

  // it("create presale account", async () => {
  //   try {
  //     // Mint 10000 tokens into admin ATA
  //     adminTokenAta = await getAssociatedTokenAddress(
  //       tokenMint,
  //       authority.publicKey,
  //       true,
  //       TOKEN_2022_PROGRAM_ID,
  //       ASSOCIATED_TOKEN_PROGRAM_ID
  //     );
  //     // adminTokenAta = await TokenClass.mintTokenTo(
  //     //   connection,
  //     //   authority,
  //     //   newAccount,
  //     //   tokenMint
  //     // );
  //     // console.log(
  //     //   "Admin Token ATA balance before :",
  //     //   (await connection.getTokenAccountBalance(adminTokenAta)).value.uiAmount
  //     // );

  //     const presaleArgs = {
  //       authority: authority.publicKey,
  //       startTime: new anchor.BN(startTime),
  //       endTime: new anchor.BN(endTime),
  //       minimumBuyableAmount: new anchor.BN(1 * LAMPORTS_PER_SOL),
  //       maximumBuyableAmount: new anchor.BN(1000 * LAMPORTS_PER_SOL),
  //       isPresaleEnded: false,
  //       presaleTokenAmount: new anchor.BN(1000 * LAMPORTS_PER_SOL),
  //     };
  //     // console.log("Presale Args:", presaleArgs);
  //     presaleTokenAta = await getAssociatedTokenAddress(
  //       tokenMint,
  //       presaleAccountPDA,
  //       true,
  //       TOKEN_2022_PROGRAM_ID,
  //       ASSOCIATED_TOKEN_PROGRAM_ID
  //     );
  //     // console.log("Presale Token ATA:", presaleTokenAta.toBase58());

  //     // const accountData = {
  //     //   authority: newAccount.publicKey,
  //     //   adminTokenAta,
  //     //   tokenMint,
  //     // };
  //     // console.log("Account Data:", accountData);

  //     const ix = await program.methods
  //       .createPresale(presaleArgs)
  //       .accounts({
  //         authority: authority.publicKey,
  //         creatorAccount: creatorAccountPDA,
  //         presaleAccount: presaleAccountPDA,
  //         presaleTokenAta,
  //         adminTokenAta,
  //         presaleProgramData: presaleProgramDataPda,
  //         tokenMint,
  //         tokenProgram: TOKEN_2022_PROGRAM_ID,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       })
  //       .instruction();

  //     const tx = new Transaction();
  //     tx.add(ix);

  //     const signature = await sendAndConfirmTransaction(connection, tx, [
  //       authority,
  //     ]);
  //     console.log("Create Presale Transaction Signature:", signature);

  //     // const balancePresale = await connection.getTokenAccountBalance(
  //     //   presaleTokenAta
  //     // );
  //     // const balanceAdmin = await connection.getTokenAccountBalance(
  //     //   adminTokenAta
  //     // );
  //     // const presaleAccountData = await program.account.presaleAccount.fetch(
  //     //   presaleAccountPDA
  //     // );
  //     // console.log("Fetched Presale Account Data:", presaleAccountData);
  //     // console.log("Presale Token ATA Balance:", balancePresale.value.uiAmount);
  //     // console.log("Admin Token ATA Balance:", balanceAdmin.value.uiAmount);
  //   } catch (error) {
  //     console.log("Error during presale account creation:", error);
  //     throw error;
  //   }
  // });
   
  // it("Update the presale", async () => {
  //   try {
  //     const updatePresaleArgs = {
  //       startTime: new anchor.BN(startTime),
  //       endTime: new anchor.BN(startTime + 60 * 10),
  //       minimumBuyableAmount: new anchor.BN(10 * LAMPORTS_PER_SOL),
  //       maximumBuyableAmount: new anchor.BN(1000 * LAMPORTS_PER_SOL),
  //       isPresaleEnded: false,
  //     };
  //     // console.log("Presale Args:", updatePresaleArgs);

  //     const accountData = {
  //       authority: newAccount.publicKey,
  //     };
  //     // console.log("Account Data:", accountData);

  //     const ix = await program.methods
  //       .updatePresale(updatePresaleArgs)
  //       .accounts(accountData)
  //       .instruction();

  //     const tx = new Transaction();
  //     tx.add(ix);

  //     const signature = await sendAndConfirmTransaction(connection, tx, [
  //       newAccount,
  //     ]);
  //     console.log("Update Presale Transaction Signature:", signature);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  // it("Purchase the token", async () => {
  //   try {
  //     let buyer = newAccount;

  //     let tokenAmount = new anchor.BN(200 * LAMPORTS_PER_SOL);
  //     console.log("Token Amount to Purchase:", tokenAmount);

  //     let buyerTokenAta = await getAssociatedTokenAddress(
  //       tokenMint,
  //       buyer.publicKey,
  //       true,
  //       TOKEN_2022_PROGRAM_ID,
  //       ASSOCIATED_TOKEN_PROGRAM_ID
  //     );

  //     console.log(
  //       "Buyer(Admin) Token ATA balance  before bying the token:",
  //       (await connection.getTokenAccountBalance(buyerTokenAta)).value.uiAmount
  //     );

  //     // const purchaseAccountData = {
  //     //   buyer: buyer.publicKey,
  //     //   buyerTokenAta,
  //     //   presaleTokenAta,
  //     //   tokenMint,
  //     // };
  //     // console.log("Purchase Account Data:", purchaseAccountData);

  //     const ix = await program.methods
  //       .purchaseToken(tokenAmount)
  //       .accounts({
  //         buyer: buyer.publicKey,
  //         creatorAccount: creatorAccountPDA,
  //         presaleAccount: presaleAccountPDA,
  //         buyerTokenAta,
  //         presaleTokenAta,
  //         presaleProgramData: presaleProgramDataPda,
  //         tokenMint,
  //         tokenProgram: TOKEN_2022_PROGRAM_ID,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       })
  //       .instruction();

  //     const tx = new Transaction();
  //     tx.add(ix);

  //     const signature = await sendAndConfirmTransaction(connection, tx, [
  //       buyer,
  //     ]);
  //     console.log("Purchase Transaction Signature:", signature);

  //     const balancePresaleToken = await connection.getTokenAccountBalance(
  //       presaleTokenAta
  //     );

  //     const balanceBuyerToken = await connection.getTokenAccountBalance(
  //       buyerTokenAta
  //     );

  //     console.log(
  //       `Presale Token ATA Balance: ${await balancePresaleToken.value.uiAmount}`
  //     );

  //     console.log(
  //       `Buyer Token ATA
  //         ${await balanceBuyerToken.value.uiAmount}`
  //     );
  //   } catch (error) {
  //     if (error.logs) {
  //       const invalidTimeErrorMessage = "Invalid Time";

  //       // Check if any log contains "Invalid Time" and assert it directly
  //       const foundInvalidTimeError = error.logs.some((log: string) =>
  //         log.includes(invalidTimeErrorMessage)
  //       );

  //       if (foundInvalidTimeError) {
  //         assert.equal(foundInvalidTimeError, true, "Error message mismatch.");
  //         console.log("Invalid Time Error, (Presale has not started yet!)");
  //       }
  //     } else {
  //       // If there are no logs, throw the error
  //       console.log(error);
  //       throw error;
  //     }
  //   }
  // });

  // it("Withdraw the token", async () => {
  //   try {
  //     let token = 200;
      // let token_amount = new anchor.BN(token * LAMPORTS_PER_SOL);

  //     console.log(`
  //       Presale token balance before withdraw ammount of ${token} token
  //       , balance is: ${
  //         (await connection.getTokenAccountBalance(presaleTokenAta)).value
  //           .uiAmount
  //       }`);

  //     const withdrawTokenData = {
  //       authority: newAccount.publicKey,
  //       presaleTokenAta: presaleTokenAta,
  //       adminTokenAta: adminTokenAta,
  //       tokenMint: tokenMint,
  //     };
  //     const ix = await program.methods
  //       .withdrawToken(token_amount)
  //       .accounts(withdrawTokenData)
  //       .instruction();

  //     const tx = new Transaction();
  //     tx.add(ix);

  //     const signature = await sendAndConfirmTransaction(connection, tx, [
  //       newAccount,
  //     ]);

  //     console.log("Withdraw Token Signature:", await signature);

  //     // console.log("Admin Token ATA:", adminTokenAta.toBase58());

  //     const balanceAdminToken = await connection.getTokenAccountBalance(
  //       adminTokenAta
  //     );

  //     const balancePresaleToken = await connection.getTokenAccountBalance(
  //       presaleTokenAta
  //     );

  //     console.log(
  //       `Admin Token ATA Balance: ${await balanceAdminToken.value.uiAmount}`
  //     );
  //     console.log(
  //       `Presale Token ATA Balance: ${await balancePresaleToken.value.uiAmount}`
  //     );
  //   } catch (error) {
  //     if (
  //       (await connection.getTokenAccountBalance(presaleTokenAta)).value
  //         .uiAmount == 0
  //     ) {
  //       const errorLog = error.logs.find((log: any) =>
  //         log.includes("insufficient funds")
  //       );
  //       assert.equal(errorLog, "Program log: Error: insufficient funds");
  //     }
  //     console.log(error);
  //     throw error;
  //   }
  // });

  // it("Rewoke the access ", async () => {
  //   try {
  //     const newAccount = Keypair.generate();
  //     const ix = await program.methods
  //       .rewokeAccess()
  //       .accounts({ authority: authority.publicKey })
  //       .instruction();
  //     const tx = new Transaction();
  //     tx.add(ix);

  //     const signature = await sendAndConfirmTransaction(connection, tx, [
  //       authority,
  //     ]);

  //     console.log("Rewoke access signature: ", signature);

  //     function delay(ms: number): Promise<void> {
  //       return new Promise((resolve) => setTimeout(resolve, ms));
  //     }

  //     // Example function with a 5-second delay
  //     async function delayedFunction() {
  //       console.log("Delayed function started");
  //       await delay(5000); // 5 seconds delay
  //       console.log("Delayed function finished after 5 seconds");
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     throw error;
  //   }
  // });

  // it("Withdraw the token(Error due to rewoking the access)", async () => {
  //   try {
  //     let token = 200;
  //     let token_amount = new anchor.BN(token * LAMPORTS_PER_SOL);

  //     console.log(`
  //       Presale token balance before withdraw ammount of ${token} token
  //       , balance is: ${
  //         (await connection.getTokenAccountBalance(presaleTokenAta)).value
  //           .uiAmount
  //       }`);

  //     const withdrawTokenData = {
  //       authority: newAccount.publicKey,
  //       presaleTokenAta: presaleTokenAta,
  //       adminTokenAta: adminTokenAta,
  //       tokenMint: tokenMint,
  //     };
  //     const ix = await program.methods
  //       .withdrawToken(token_amount)
  //       .accounts(withdrawTokenData)
  //       .instruction();

  //     const tx = new Transaction();
  //     tx.add(ix);

  //     const signature = await sendAndConfirmTransaction(connection, tx, [
  //       newAccount,
  //     ]);

  //     console.log("Withdraw Token Signature:", await signature);

  //     // console.log("Admin Token ATA:", adminTokenAta.toBase58());

  //     const balanceAdminToken = await connection.getTokenAccountBalance(
  //       adminTokenAta
  //     );

  //     const balancePresaleToken = await connection.getTokenAccountBalance(
  //       presaleTokenAta
  //     );

  //     console.log(
  //       `Admin Token ATA Balance: ${await balanceAdminToken.value.uiAmount}`
  //     );
  //     console.log(
  //       `Presale Token ATA Balance: ${await balancePresaleToken.value.uiAmount}`
  //     );
  //   } catch (error) {
  //     if (error.logs) {
  //       const unauthorisedAccessErrorMessage = "Unauthorized access";

  //       // Properly return the result of the condition inside the `some()` method
  //       const foundError = error.logs.some((log: string) =>
  //         log.includes(unauthorisedAccessErrorMessage)
  //       );

  //       if (foundError) {
  //         assert.equal(foundError, true, "Error Message: Unauthorized access");
  //         console.log(`Error: Unauthorized access(check the authority!)`);
  //       }
  //     } else {
  //       console.log(error);
  //       throw error;
  //     }
  //   }
  // });
  
});
