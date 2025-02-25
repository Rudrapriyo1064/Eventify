import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { nftaddress, nftmarketaddress } from "../config";
import NFT from "../artifacts/contracts/NFTTicket.sol/NFTTicket.json";
import Market from "../artifacts/contracts/TicketMarket.sol/TicketMarket.json";

// Initialize with default provider
const providerUrl = process.env.NEXT_PUBLIC_GETBLOCK_API_URL;
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
export const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider);
export const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, provider);

export const signers = async () => {
  try {
    const web3Modal = new Web3Modal({
      network: "mumbai", // optional
      cacheProvider: true, // optional
      providerOptions: {} // required
    });
    
    const connection = await web3Modal.connect();
    const signedProvider = new ethers.providers.Web3Provider(connection);
    const signer = signedProvider.getSigner();

    const signedTokenContract = new ethers.Contract(
      nftaddress, 
      NFT.abi, 
      signer
    );
    
    const signedMarketContract = new ethers.Contract(
      nftmarketaddress,
      Market.abi,
      signer
    );

    if (!signedTokenContract || !signedMarketContract) {
      throw new Error("Failed to initialize contracts");
    }

    return { 
      signedMarketContract, 
      signedTokenContract, 
      signer 
    };
  } catch (error) {
    console.error("Error in signers:", error);
    return null;
  }
};
