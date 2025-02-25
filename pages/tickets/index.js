import Link from "next/link";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import styles from "../../styles/Card.module.scss";
import axios from "axios";

import InrPrice from "../../components/price/Inr";
import { tokenContract, signers } from "../../components/Contracts";
import { nftaddress } from "../../config";
import QR from "../../components/QR"; // Import the QR component

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loadingState, setLoadingState] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      // Initialize contracts first
      const signedContracts = await signers();
      if (!signedContracts) {
        throw new Error("Failed to initialize contracts");
      }

      const { signedMarketContract, signedTokenContract, signer } = signedContracts;
      
      // Additional check for individual contracts
      if (!signedMarketContract || !signedTokenContract || !signer) {
        throw new Error("One or more contracts failed to initialize");
      }

      const userAddress = await signer.getAddress();
      const ticketContractData = await signedMarketContract.getMyTickets(nftaddress);
      
      if (!ticketContractData || !Array.isArray(ticketContractData)) {
        throw new Error("Invalid ticket data received");
      }

      console.log("Ticket Contract Data:", ticketContractData);

      const myTickets = await Promise.all(
        ticketContractData.map(async (i) => {
          try {
            if (!i || !i.tokenId) {
              console.log("Invalid ticket item:", i);
              return null;
            }

            const tokenId = i.tokenId.toNumber();
            const tokenUri = await signedTokenContract.uri(tokenId);
            console.log("Token URI:", tokenUri);
            
            if (!tokenUri) {
              throw new Error(`No URI found for token ${tokenId}`);
            }

            const ticketRequest = await axios.get(tokenUri);
            const ticketData = ticketRequest.data;

            const eventId = i.eventId.toNumber();
            const eventContractData = await signedMarketContract.getEvent(eventId);
            
            if (!eventContractData || !eventContractData.uri) {
              throw new Error(`No event data found for event ${eventId}`);
            }

            const eventUri = await eventContractData.uri;
            console.log("Event URI:", eventUri);
            const eventRequest = await axios.get(eventUri);
            const eventData = eventRequest.data;

            const price = ethers.utils.formatUnits(i.price.toString(), "ether");
            const inrPrice = await InrPrice(price);
            const qty = await signedTokenContract.balanceOf(userAddress, tokenId);

            return {
              eventId,
              eventName: eventData.name || "Unknown Event",
              imageUri: eventData.image || "",
              startDate: eventData.eventDate || "No date specified",
              location: eventData.location || "No location specified",
              tokenId,
              ticketName: ticketData.name || "Unknown Ticket",
              price,
              inrPrice,
              quantity: qty.toNumber(),
            };
          } catch (error) {
            console.error("Error processing ticket:", error);
            return null;
          }
        })
      );

      const validTickets = myTickets.filter(ticket => ticket !== null);
      console.log("Valid Tickets:", validTickets);
      setTickets(validTickets);
    } catch (error) {
      console.log("Error in loadTickets:", error);
      const errorMessage = error.data ? error.data.message : error.message;
      setErr(errorMessage);
    } finally {
      setLoadingState(true);
    }
  }

  if (!loadingState) {
    return <h1 className="container display-1">Loading...</h1>;
  }

  if (err) {
    return <p className="container text-danger display-6">{err}</p>;
  }

  return (
    <div className="container justify-content-center align-items-center">
      <h1 className="text-center m-4">Your Tickets</h1>
      {tickets.length < 1 ? (
        <p className="display-5 text-center">
          You do not own any tickets right now
        </p>
      ) : (
        <div className="row justify-content-center align-items-center">
          {tickets.map((ticket) => (
            <div
              key={ticket.tokenId}
              className="card border border-dark shadow"
            >
              <div className="row card-body">
                <div className="col-3 d-none d-md-block">
                  <img src={ticket.imageUri} className={styles.cardImgTop} />
                </div>
                <div className="col-6 col-md-5">
                  <div style={{ height: "65px", overflow: "auto" }}>
                    <h3 className="card-title">
                      <span className="fw-bold text-primary">
                        {ticket.eventName}
                      </span>{" "}
                      - ID: #{ticket.eventId}
                    </h3>
                  </div>
                  <div
                    className="mt-2"
                    style={{ height: "50px", overflow: "auto" }}
                  >
                    <h5>
                      <i className="bi bi-calendar3"></i> {ticket.startDate}
                    </h5>
                  </div>
                  <div style={{ height: "60", overflow: "auto" }}>
                    <h5>
                      <i className="bi bi-geo-alt-fill"></i> {ticket.location}
                    </h5>
                  </div>
                </div>
                <div className="col-4 col-md-3">
                  <div style={{ height: "37px", overflow: "auto" }}>
                    <h3>Qty: {ticket.quantity}</h3>
                  </div>
                  <div style={{ height: "60px", overflow: "auto" }}>
                    <h4>
                      <i className="bi bi-ticket-fill"></i> {ticket.ticketName}
                    </h4>
                  </div>
                  <div style={{ height: "32px", overflow: "auto" }}>
                    <h5>ID: #{ticket.tokenId}</h5>
                  </div>
                  <div style={{ height: "73px", overflow: "auto" }}>
                    <h5 className="text-primary fw-bold">
                      Price: ₹{ticket.inrPrice}
                    </h5>
                    <p className="text-secondary">= {ticket.price} MATIC</p>
                  </div>
                </div>
                <div className="col-2 col-md-1 d-flex align-items-center mx-auto">
                  <div
                    data-bs-toggle="tooltip"
                    title="View Ticket Details"
                    className="mx-auto"
                  >
                    <Link href={`/tickets/${ticket.tokenId}`}>
                      <i
                        style={{ fontSize: "45px" }}
                        className="bi bi-arrow-right-square"
                      ></i>
                    </Link>
                  </div>
                </div>
                {/* <div className="col-12">
                  <QR
                    event={ticket.eventName}
                    ticket={ticket.ticketName}
                    quantity={ticket.quantity}
                    tokenId={ticket.tokenId}
                  />
                </div> */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}