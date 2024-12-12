// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { PreSaleContact } from "../target/types/pre_sale_contact";
// import { expect, assert } from "chai";
// import {
//   TOKEN_2022_PROGRAM_ID,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   createMint,
//   createAssociatedTokenAccount,
//   getAssociatedTokenAddress,
//   createMintToInstruction,
// } from "@solana/spl-token";
// import {
//   Connection,
//   SystemProgram,
//   PublicKey,
//   Keypair,
//   LAMPORTS_PER_SOL,
//   sendAndConfirmTransaction,
//   Transaction,
//   clusterApiUrl,
//   SYSVAR_RENT_PUBKEY,
// } from "@solana/web3.js";
// import BN from "bn.js";
// import base58 from "bs58";

// import TokenClass from "./spl-token";
// import {
//   sendVersionedTransactionWithComputeUnits,
//   wait,
// } from "../utils/versionedTransaction";

// describe("pre-sale-program", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);
//   const connection = provider.connection;
//   const program = anchor.workspace.PreSaleContact as Program<PreSaleContact>;
//   console.log(program.programId);

//   const authority = Keypair.fromSecretKey(
//     base58.decode(
//       "3bnhkgJF7h73KmEmqgMA5AFNQtaPwbEb9iWH76LGmc9f4Ub8jaNkVT5VcuRQTenRXMitVU9YaYdkHofTdvjatE3"
//     )
//   );
//   console.log("Authority Public Key:", authority.publicKey.toBase58());
//   const newAccount = Keypair.fromSecretKey(
//     base58.decode(
//       "6tKSJTj2NJgoXYxP44P9NrekA7HCsrnfmukL5k8fcTExthhT8DYt644jnwMdmQuGGesbhj6XERXspZKJjEWg8p6"
//     )
//   );

//   // const authority = Keypair.generate();
//   const [presaleAccountPDA] = PublicKey.findProgramAddressSync(
//     [Buffer.from(anchor.utils.bytes.utf8.encode("presale"))],
//     program.programId
//   );

//   const [creatorAccountPDA] = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from(anchor.utils.bytes.utf8.encode("creator_seed")),
//       newAccount.publicKey.toBuffer(),
//     ],
//     program.programId
//   );
//   // console.log("Presale Account PDA:", presaleAccountPDA.toBase58());

//   const [presaleProgramDataPda] = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from(anchor.utils.bytes.utf8.encode("Presale")),
//       Buffer.from(anchor.utils.bytes.utf8.encode("program_data")),
//     ],
//     program.programId
//   );
//   // console.log("Presale Program Data PDA:", presaleProgramDataPda.toBase58());

//   const startTime = Math.floor(new Date().getTime() / 1000) + 5;

//   // Calculate end time by adding 86400 seconds (1 day) to the start time
//   const endTime = startTime + 86400;

//   let tokenMint: PublicKey;
//   let presaleTokenAta: PublicKey;
//   let adminTokenAta: PublicKey;

//   async function airdrop(receiver: PublicKey) {
//     const airdropSignature = await connection.requestAirdrop(
//       receiver,
//       5 * LAMPORTS_PER_SOL
//     );

//     const latestBlockhash = await connection.getLatestBlockhash();
//     await connection.confirmTransaction({
//       signature: airdropSignature,
//       blockhash: latestBlockhash.blockhash,
//       lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
//     });

//     // const balance = await connection.getBalance(receiver);
//   }

//   it("Iniitialize the pre-sale contract", async () => {
//     await airdrop(authority.publicKey);
//     await airdrop(newAccount.publicKey);

//     tokenMint = await TokenClass.createToken(connection, authority);

//     // tokenMint = new PublicKey("6xt5DLMNjZCVYoLxifnKFngrvbWjkehy2AtbrLTZJroQ");
//     try {
//       const ix = await program.methods
//         .initialize({ tokenMint })
//         .accounts({
//           authority: authority.publicKey,
//           tokenMint,
//         })
//         .instruction();

//       await sendVersionedTransactionWithComputeUnits(
//         provider,
//         [ix],
//         [authority]
//       );

//       const presaleProgramData = await program.account.presaleProgramData.fetch(
//         presaleProgramDataPda
//       );

//       expect(presaleProgramData.tokenMint.toBase58()).to.equal(
//         tokenMint.toBase58()
//       );
//     } catch (error) {
//       console.log("Error during presale initialization:", error);
//       throw error;
//     }
//   });

//   it("Grant access to the admin", async () => {
//     try {
//       const ix = await program.methods
//         .grantAccess(newAccount.publicKey)
//         .accounts({
//           authority: authority.publicKey,
//           creator: newAccount.publicKey,
//         })
//         .instruction();

//       const tx = new Transaction();
//       tx.add(ix);

//       await sendVersionedTransactionWithComputeUnits(
//         provider,
//         [ix],
//         [authority]
//       );
//     } catch (error) {
//       console.log(error);
//       throw error;
//     }
//   });

//   it("create presale account", async () => {
//     try {
//       adminTokenAta = await TokenClass.mintTokenTo(
//         connection,
//         authority,
//         newAccount,
//         tokenMint
//       );

//       // console.log(
//       //   "Admin Token ATA balance before :",
//       //   (await connection.getTokenAccountBalance(adminTokenAta))
//       // );

//       const presaleArgs = {
//         authority: newAccount.publicKey,
//         startTime: new anchor.BN(startTime),
//         endTime: new anchor.BN(endTime),
//         minimumBuyableAmount: new anchor.BN(10 * LAMPORTS_PER_SOL),
//         maximumBuyableAmount: new anchor.BN(1000 * LAMPORTS_PER_SOL),
//         isPresaleEnded: false,
//         presaleTokenAmount: new anchor.BN(1000 * LAMPORTS_PER_SOL),
//       };
//       // console.log("Presale Args:", presaleArgs);
//       presaleTokenAta = await getAssociatedTokenAddress(
//         tokenMint,
//         presaleAccountPDA,
//         true,
//         TOKEN_2022_PROGRAM_ID,
//         ASSOCIATED_TOKEN_PROGRAM_ID
//       );

//       const ix = await program.methods
//         .createPresale(presaleArgs)
//         .accountsStrict({
//           authority: newAccount.publicKey,
//           creatorAccount: creatorAccountPDA,
//           presaleAccount: presaleAccountPDA,
//           presaleTokenAta: presaleTokenAta,
//           adminTokenAta: adminTokenAta,
//           presaleProgramData: presaleProgramDataPda,
//           tokenMint,
//           tokenProgram: TOKEN_2022_PROGRAM_ID,
//           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//           systemProgram: SystemProgram.programId,
//           rent: SYSVAR_RENT_PUBKEY,
//         })
//         .instruction();

//       const tx = new Transaction();
//       tx.add(ix);

//       // console.log(ix);

//       await sendVersionedTransactionWithComputeUnits(
//         provider,
//         [ix],
//         [newAccount]
//       );
//       const balancePresale = await connection.getTokenAccountBalance(
//         presaleTokenAta
//       );
//       const balanceAdmin = await connection.getTokenAccountBalance(
//         adminTokenAta
//       );
//       const presaleAccountData = await program.account.presaleAccount.fetch(
//         presaleAccountPDA
//       );
//     } catch (error) {
//       console.log("Error during presale account creation:", error);
//       throw error;
//     }
//   });

//   it("Purchase the token", async () => {
//     try {
//       let buyer = newAccount;

//       let tokenAmount = new anchor.BN(200 * LAMPORTS_PER_SOL);
//       console.log("Token Amount to Purchase:", tokenAmount);

//       let buyerTokenAta = await getAssociatedTokenAddress(
//         tokenMint,
//         buyer.publicKey,
//         true,
//         TOKEN_2022_PROGRAM_ID,
//         ASSOCIATED_TOKEN_PROGRAM_ID
//       );

//       await wait(3000);
//       const ix = await program.methods
//         .purchaseToken(tokenAmount)
//         .accountsStrict({
//           buyer: buyer.publicKey,
//           creatorAccount: creatorAccountPDA,
//           presaleAccount: presaleAccountPDA,
//           buyerTokenAta,
//           presaleTokenAta,
//           presaleProgramData: presaleProgramDataPda,
//           tokenMint,
//           tokenProgram: TOKEN_2022_PROGRAM_ID,
//           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//           systemProgram: SystemProgram.programId,
//           rent: SYSVAR_RENT_PUBKEY,
//         })
//         .instruction();

//       await sendVersionedTransactionWithComputeUnits(provider, [ix], [buyer]);

//       const balancePresaleToken = await connection.getTokenAccountBalance(
//         presaleTokenAta
//       );

//       const balanceBuyerToken = await connection.getTokenAccountBalance(
//         buyerTokenAta
//       );
//     } catch (error) {
//       console.log(error.logs);
//     }
//   });

//   it("Withdraw the token", async () => {
//     try {
//       let token = 200;
//       let token_amount = new anchor.BN(token * LAMPORTS_PER_SOL);

//       const withdrawTokenData = {
//         authority: newAccount.publicKey,
//         presaleTokenAta: presaleTokenAta,
//         adminTokenAta: adminTokenAta,
//         tokenMint: tokenMint,
//       };
//       const ix = await program.methods
//         .withdrawToken(token_amount)
//         .accounts(withdrawTokenData)
//         .instruction();

//       const tx = new Transaction();
//       tx.add(ix);

//       await sendVersionedTransactionWithComputeUnits(provider, [ix], [newAccount]);


//       const balanceAdminToken = await connection.getTokenAccountBalance(
//         adminTokenAta
//       );

//       const balancePresaleToken = await connection.getTokenAccountBalance(
//         presaleTokenAta
//       );

//       console.log(
//         `Admin Token ATA Balance: ${await balanceAdminToken.value.uiAmount}`
//       );
//       console.log(
//         `Presale Token ATA Balance: ${await balancePresaleToken.value.uiAmount}`
//       );
//     } catch (error) {
//       if (
//         (await connection.getTokenAccountBalance(presaleTokenAta)).value
//           .uiAmount == 0
//       ) {
//         const errorLog = error.logs.find((log: any) =>
//           log.includes("insufficient funds")
//         );
//         assert.equal(errorLog, "Program log: Error: insufficient funds");
//       }
//       console.log(error);
//       throw error;
//     }
//   });

//   it("Rewoke the access ", async () => {
//     try {
//       const newAccount = Keypair.generate();
//       const ix = await program.methods
//         .revokeAccess(newAccount.publicKey)
//         .accounts({ 
//           authority: authority.publicKey,
//           // presaleProgramData: presaleProgramDataPda,
//           // creatorAccount: creatorAccountPDA,
//           // systemProgram: SystemProgram.programId
//          })
//         .instruction();

//       await sendVersionedTransactionWithComputeUnits(provider, [ix], [authority]);

//     } catch (error) {
//       console.log(error);
//       throw error;
//     }
//   });

// });
