import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PreSaleContract } from "../target/types/pre_sale_contract";

import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  Connection,
  SystemProgram,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction,
  clusterApiUrl,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import BN from "bn.js";
import base58 from "bs58";

import TokenClass from "./spl-token";

describe("pre-sale-contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const program = anchor.workspace.PreSaleContract as Program<PreSaleContract>;

  const authority = Keypair.fromSecretKey(
    base58.decode(
      "3bnhkgJF7h73KmEmqgMA5AFNQtaPwbEb9iWH76LGmc9f4Ub8jaNkVT5VcuRQTenRXMitVU9YaYdkHofTdvjatE3"
    )
  );

  const buyer = Keypair.fromSecretKey(
    base58.decode(
      "5fUnbzNh6bRVHFBuMuaSVmQL73KaFiJyg6nhopGf15gCF2q2WwVoqnGX6RsqvMrSX3L4xFYHNxoE61JwTzkBGQib"
    )
  );

  const feePayer = Keypair.fromSecretKey(
    base58.decode(
      "2ZvrwHSG1TjLJiQ3wUdp5jEkLZNGpRZytjMTCSkJ5LBKuYsCGctHxcXeCwxYQwGKvin8ffnKaPFgBkhDzAuBd39h"
    )
  );
  const [presaleAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(anchor.utils.bytes.utf8.encode("presale_seed"))],
    program.programId
  );
  const [creatorAccountPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("creator_seed")),
      authority.publicKey.toBuffer(),
    ],
    program.programId
  );
  const [presaleProgramDataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(anchor.utils.bytes.utf8.encode("presale_seed")),
      Buffer.from(anchor.utils.bytes.utf8.encode("program_data_seed")),
    ],
    program.programId
  );

  let tokenMint: PublicKey;
  let paymentMint: PublicKey;
  let presaleTokenAta: PublicKey;
  let adminTokenAta: PublicKey;

  const startTime = Math.floor(new Date().getTime() / 1000) + 1 * 60;
  console.log("Start Time:", startTime);

  // Calculate end time by adding 86400 seconds (1 day) to the start time
  const endTime = startTime + 30 * 60;
  console.log("End Time:", endTime);

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
  }

  it("Iniitialize the pre-sale contract", async () => {
    // await airdrop(authority.publicKey);
    // await airdrop(buyer.publicKey);
    // await airdrop(feePayer.publicKey);

    // tokenMint = await TokenClass.createToken(connection, authority);
    // paymentMint = await TokenClass.createToken(connection, buyer);
    // old token --> 6xt5DLMNjZCVYoLxifnKFngrvbWjkehy2AtbrLTZJroQ
    tokenMint = new PublicKey("3RgagUSd3RERM3kkpYSDZ61DzimJdA3MNAmpWRbVS5H4");
    paymentMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

    console.log("tokenMint Address:", tokenMint.toBase58());
    console.log("paymentMint Address:", paymentMint.toBase58());

    const initializeArgs = {
      tokenMint: tokenMint,
    };

    try {
      const ix = await program.methods
        .initialize(initializeArgs)
        .accounts({
          authority: authority.publicKey,
          tokenMint,
        })
        .instruction();
      const tx = new Transaction();
      tx.add(ix);

      // const signature = await sendAndConfirmTransaction(connection, tx, [
      //   authority,
      // ]);
      // console.log("Initialization Transaction Signature:", signature);
    } catch (error) {
      console.log("Error during presale initialization:", error);
      throw error;
    }
  });

  it("Grant access to the admin", async () => {
    try {
      const ix = await program.methods
        .grantAccess(authority.publicKey)
        .accounts({
          authority: authority.publicKey,
        })
        .instruction();

      const tx = new Transaction();
      tx.add(ix);

      // const signature = await sendAndConfirmTransaction(connection, tx, [
      //   authority,
      // ]);
      // console.log("Grant access Transaction Signature:", signature);
    } catch (error) {
      console.log(error);
      throw error;
    }
  });

  it("create presale account", async () => {
    try {
      // adminTokenAta = await TokenClass.mintTokenTo(
      //   connection,
      //   authority,
      //   authority,
      //   tokenMint
      // );

      // console.log(
      //   "Admin Token ATA balance before :",
      //   (await connection.getTokenAccountBalance(adminTokenAta))
      // );
      adminTokenAta = await getAssociatedTokenAddress(
        tokenMint,
        authority.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const presaleArgs = {
        authority: authority.publicKey,
        startTime: new anchor.BN(startTime),
        endTime: new anchor.BN(endTime),
        minimumBuyableAmount: new anchor.BN(1 * LAMPORTS_PER_SOL),
        maximumBuyableAmount: new anchor.BN(100 * LAMPORTS_PER_SOL),
        presaleTokenAmount: new anchor.BN(100 * LAMPORTS_PER_SOL),
        tokenPriceInUsdc: new anchor.BN(0.25 * 1000000),
      };
      presaleTokenAta = await getAssociatedTokenAddress(
        tokenMint,
        presaleAccountPDA,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      // console.log(
      //   "Presale Token ATA:",
      //   JSON.stringify(
      //     {
      //       authority: authority.publicKey,
      //       creatorAccount: creatorAccountPDA,
      //       presaleAccount: presaleAccountPDA,
      //       presaleTokenAta: presaleTokenAta,
      //       adminTokenAta: adminTokenAta,
      //       presaleProgramData: presaleProgramDataPda,
      //       tokenMint,
      //       tokenProgram: TOKEN_2022_PROGRAM_ID,
      //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      //       systemProgram: SystemProgram.programId,
      //       rent: SYSVAR_RENT_PUBKEY,
      //     },
      //     null,
      //     2
      //   )
      // );

      const ix = await program.methods
        .createPresale(presaleArgs)
        .accountsStrict({
          authority: authority.publicKey,
          creatorAccount: creatorAccountPDA,
          presaleAccount: presaleAccountPDA,
          presaleTokenAta: presaleTokenAta,
          adminTokenAta: adminTokenAta,
          presaleProgramData: presaleProgramDataPda,
          tokenMint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      const tx = new Transaction();
      tx.add(ix);

      // const signature = await connection.sendTransaction(tx, [authority], {
      //   skipPreflight: false,
      //   preflightCommitment: "confirmed", // Set preflight commitment level
      // });

      // console.log("Transaction sent with signature:", signature);

      // // Wait for confirmation
      // const latestBlockhash = await connection.getLatestBlockhash();
      // const confirmation = await connection.confirmTransaction(
      //   {
      //     signature,
      //     blockhash: latestBlockhash.blockhash,
      //     lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      //   },
      //   "confirmed" // Set the desired confirmation level here
      // );

      // if (confirmation.value.err) {
      //   console.error("Transaction failed:", confirmation.value.err);
      //   throw new Error("Transaction failed");
      // }
      // // Fetch the transaction details using getTransaction
      // const transactionDetails = await connection.getTransaction(signature, {
      //   commitment: "confirmed",
      // });

      // // Display transaction logs
      // console.log(transactionDetails.meta.logMessages);

      // const balancePresale = await connection.getTokenAccountBalance(
      //   presaleTokenAta
      // );
      // const balanceAdmin = await connection.getTokenAccountBalance(
      //   adminTokenAta
      // );
      // const presaleAccountData = await program.account.presaleAccount.fetch(
      //   presaleAccountPDA
      // );
      // // console.log("Fetched Presale Account Data:", presaleAccountData);
      // console.log("Presale Token ATA Balance:", balancePresale.value.uiAmount);
      // console.log("Admin Token ATA Balance:", balanceAdmin.value.uiAmount);
    } catch (error) {
      console.log("Error during presale account creation:", error);
      throw error;
    }
  });

  it("Update the presale", async () => {
    try {
      const updatePresaleArgs = {
        endTime: new anchor.BN(endTime - 28 * 60),
      };
      // console.log("Presale Args:", updatePresaleArgs);

      // const accountData = {
      //   authority: newAccount.publicKey,
      // };
      // console.log("Account Data:", accountData);

      const ix = await program.methods
        .updatePresale(updatePresaleArgs)
        .accounts({
          authority: authority.publicKey,
        })
        .instruction();

      const tx = new Transaction();
      tx.add(ix);

      // const signature = await connection.sendTransaction(tx, [authority], {
      //   skipPreflight: false,
      //   preflightCommitment: "confirmed", // Set preflight commitment level
      // });

      // console.log("Transaction sent with signature:", signature);

      // // Wait for confirmation
      // const latestBlockhash = await connection.getLatestBlockhash();
      // const confirmation = await connection.confirmTransaction(
      //   {
      //     signature,
      //     blockhash: latestBlockhash.blockhash,
      //     lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      //   },
      //   "confirmed" // Set the desired confirmation level here
      // );

      // if (confirmation.value.err) {
      //   console.error("Transaction failed:", confirmation.value.err);
      //   throw new Error("Transaction failed");
      // }
      // // Fetch the transaction details using getTransaction
      // const transactionDetails = await connection.getTransaction(signature, {
      //   commitment: "confirmed",
      // });

      // // Display transaction logs
      // console.log(transactionDetails.meta.logMessages);
    } catch (error) {
      console.log(error);
    }
  });

  it("Purchase the token", async () => {
    try {
      let tokenAmount = new anchor.BN(2 * LAMPORTS_PER_SOL);

      // const creatorPaymentTokenAta = await TokenClass.mintTokenTo(
      //   connection,
      //   buyer,
      //   authority,
      //   paymentMint
      // );

      const creatorPaymentTokenAta = await getAssociatedTokenAddress(
        paymentMint,
        authority.publicKey,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      // const ataAccountInfo2 = await connection.getAccountInfo(
      //   creatorPaymentTokenAta
      // );
      // if (!ataAccountInfo2) {
      //   console.log("ATA creator does not exist. Creating...");

      //   // Step 3: Create the ATA if it doesn't exist
      //   const transaction = new Transaction().add(
      //     createAssociatedTokenAccountInstruction(
      //       feePayer.publicKey, // Payer (must be PublicKey)
      //       creatorPaymentTokenAta, // ATA to create
      //       authority.publicKey, // Wallet to own the ATA
      //       paymentMint // Mint of the token
      //     )
      //   );
      //   // Send the transaction to create the ATA
      //   const { blockhash, lastValidBlockHeight } =
      //     await connection.getLatestBlockhash();
      //   transaction.recentBlockhash = blockhash;
      //   transaction.feePayer = feePayer.publicKey;

      //   // Sign and send the transaction
      //   const signedTransaction = await connection.sendTransaction(
      //     transaction,
      //     [feePayer]
      //   );
      //   console.log("ATA created successfully:", signedTransaction);
      // } else {
      //   console.log("ATA already exists.");
      // }

      // const buyerPaymentAta = await TokenClass.mintTokenTo(
      //   connection,
      //   buyer,
      //   buyer,
      //   paymentMint
      // );
      // console.log(buyer.publicKey);
      const buyerPaymentAta = await getAssociatedTokenAddress(
        paymentMint,
        buyer.publicKey,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // const ataAccountInfo = await connection.getAccountInfo(buyerPaymentAta);
      // if (!ataAccountInfo) {
      //   console.log("ATA does not exist. Creating...");

      //   // Step 3: Create the ATA if it doesn't exist
      //   const transaction = new Transaction().add(
      //     createAssociatedTokenAccountInstruction(
      //       feePayer.publicKey, // Payer (must be PublicKey)
      //       buyerPaymentAta, // ATA to create
      //       buyer.publicKey, // Wallet to own the ATA
      //       paymentMint // Mint of the token
      //     )
      //   );
      //   // Send the transaction to create the ATA
      //   const { blockhash, lastValidBlockHeight } =
      //     await connection.getLatestBlockhash();
      //   transaction.recentBlockhash = blockhash;
      //   transaction.feePayer = feePayer.publicKey;

      //   // Sign and send the transaction
      //   const signedTransaction = await connection.sendTransaction(
      //     transaction,
      //     [feePayer]
      //   );
      //   console.log("ATA created successfully:", signedTransaction);
      // } else {
      //   console.log("ATA already exists.");
      // }

      const buyerTokenAta = await getAssociatedTokenAddress(
        tokenMint,
        buyer.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // const paymentBalance = (
      //   await connection.getTokenAccountBalance(buyerPaymentAta)
      // ).value.uiAmount;

      // console.log(
      //   "Buyer USDC ATA balance  before bying the token:",
      //   paymentBalance
      // );

      console.log(
        "Presale :",
        JSON.stringify(
          {
            feePayer: feePayer.publicKey,
            buyer: buyer.publicKey,
            presaleAccount: presaleAccountPDA,
            buyerTokenAta: buyerTokenAta,
            buyerPaymentAta: buyerPaymentAta,
            presaleTokenAta: presaleTokenAta,
            presaleProgramData: presaleProgramDataPda,
            tokenMint: tokenMint,
            paymentMint: paymentMint,
            creatorAccount: creatorAccountPDA,
            creatorPaymentTokenAta: creatorPaymentTokenAta,
            freezeAuthority: authority.publicKey,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            tokenProgramUsdc: TOKEN_PROGRAM_ID,
          },
          null,
          2
        )
      );

      const ix = await program.methods
        .purchaseToken(tokenAmount)
        .accountsStrict({
          feePayer: feePayer.publicKey,
          buyer: buyer.publicKey,
          creatorAuthority: authority.publicKey,
          presaleAccount: presaleAccountPDA,
          buyerTokenAta: buyerTokenAta,
          buyerPaymentAta: buyerPaymentAta,
          presaleTokenAta: presaleTokenAta,
          presaleProgramData: presaleProgramDataPda,
          tokenMint: tokenMint,
          paymentMint: paymentMint,
          creatorAccount: creatorAccountPDA,
          creatorPaymentTokenAta: creatorPaymentTokenAta,
          freezeAuthority: authority.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgramUsdc: TOKEN_PROGRAM_ID,
        })
        .instruction();
      const tx = new Transaction();
      tx.add(ix);

      // console.log(ix);

      // const signature = await connection.sendTransaction(
      //   tx,
      //   [feePayer, buyer, authority],
      //   {
      //     skipPreflight: false,
      //     preflightCommitment: "confirmed", // Set preflight commitment level
      //   }
      // );

      // console.log("Transaction sent with signature:", signature);

      // // Wait for confirmation
      // const latestBlockhash = await connection.getLatestBlockhash();
      // const confirmation = await connection.confirmTransaction(
      //   {
      //     signature,
      //     blockhash: latestBlockhash.blockhash,
      //     lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      //   },
      //   "confirmed" // Set the desired confirmation level here
      // );

      // if (confirmation.value.err) {
      //   console.error("Transaction failed:", confirmation.value.err);
      //   throw new Error("Transaction failed");
      // }
      // // Fetch the transaction details using getTransaction
      // const transactionDetails = await connection.getTransaction(signature, {
      //   commitment: "confirmed",
      // });

      // // Display transaction logs
      // console.log(transactionDetails.meta.logMessages);

      // const balancePresaleToken = await connection.getTokenAccountBalance(
      //   presaleTokenAta
      // );

      // console.log(
      //   `Presale Token ATA Balance: ${await balancePresaleToken.value.uiAmount}`
      // );

      // console.log(
      //   "Buyer Presale token ATA balance  after bying the token:",
      //   (await connection.getTokenAccountBalance(buyerTokenAta)).value.uiAmount
      // );

      // console.log(
      //   "Buyer USDC ATA balance  after bying the token:",
      //   (await connection.getTokenAccountBalance(buyerPaymentAta)).value
      //     .uiAmount
      // );

      // console.log(
      //   "Creator USDC ATA balance  after bying the token:",
      //   (await connection.getTokenAccountBalance(creatorPaymentTokenAta)).value
      //     .uiAmount
      // );
    } catch (error) {
      console.log(error);
      throw error;
    }
  });

  it("Withdraw the token", async () => {
    try {
      let token = 30;
      let token_amount = new anchor.BN(token * LAMPORTS_PER_SOL);

      console.log(`
        Presale token balance before withdraw ammount of ${token} \n
        token balance is: ${
          (await connection.getTokenAccountBalance(presaleTokenAta)).value
            .uiAmount
        }`);

      const withdrawTokenData = {
        authority: authority.publicKey,
        presaleTokenAta: presaleTokenAta,
        adminTokenAta: adminTokenAta,
        tokenMint: tokenMint,
      };
      const ix = await program.methods
        .withdrawToken(token_amount)
        .accounts(withdrawTokenData)
        .instruction();

      const tx = new Transaction();
      tx.add(ix);

      const signature = await sendAndConfirmTransaction(connection, tx, [
        authority,
      ]);

      console.log("Withdraw Token Signature:", signature);

      // console.log("Admin Token ATA:", adminTokenAta.toBase58());

      const balanceAdminToken = await connection.getTokenAccountBalance(
        adminTokenAta
      );

      const balancePresaleToken = await connection.getTokenAccountBalance(
        presaleTokenAta
      );

      console.log(
        `Admin Token ATA Balance: ${await balanceAdminToken.value.uiAmount}`
      );
      console.log(
        `Presale Token ATA Balance: ${await balancePresaleToken.value.uiAmount}`
      );
    } catch (error) {
      if (
        (await connection.getTokenAccountBalance(presaleTokenAta)).value
          .uiAmount == 0
      ) {
        const errorLog = error.logs.find((log: any) =>
          log.includes("insufficient funds")
        );
      }
      console.log(error);
      throw error;
    }
  });

  // it("Rewoke the access ", async () => {
  //   try {
  //     // const newAccount = Keypair.generate();
  //     const ix = await program.methods
  //       .revokeAccess()
  //       .accounts({
  //         authority: authority.publicKey,
  //         creatorAccount: creatorAccountPDA,
  //       })
  //       .instruction();
  //     const tx = new Transaction();
  //     tx.add(ix);

  //     const signature = await sendAndConfirmTransaction(connection, tx, [
  //       authority,
  //     ]);

  //     console.log("Rewoke access signature: ", signature);
  //   } catch (error) {
  //     console.log(error);
  //     throw error;
  //   }
  // });
});
