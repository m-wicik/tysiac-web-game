const playerOrder = ["You", "Alice", "Bob"];

let leftOfDealer;
let allowedToBid = [];
let playPhase = null;
let playerBidding = null;
let currentBid = 100;
let currentBidder = null;
let minimumBid = null;
const maximumBid = 300;
const cardOrder = ["A♥", "10♥", "K♥", "Q♥", "J♥", "9♥", 
                   "A♦", "10♦", "K♦", "Q♦", "J♦", "9♦", 
                   "A♣", "10♣", "K♣", "Q♣", "J♣", "9♣", 
                   "A♠", "10♠", "K♠", "Q♠", "J♠", "9♠"];
let deck = [];
let yourHand = [];
let aliceHand = [];
let bobHand = [];
let widow = [];
let giveToAlice = null;
let giveToBob = null;
let whoStarted = null;
let whoseTurn = null;
let scoreSheet = [];
let foldSheet = [];
let roundScores = [0, 0, 0];
let currentTrump = null;
let cardsPlayed = [];
let hasFolded = [];
let currentInstructions = -1;

import { instructions, instructionsHeadings } from './instructions.js';

document.getElementById("start-button").onclick = () => { startGame() };
document.getElementById("instructions-button").onclick = () => { showInstructions() };
document.getElementById("next-instructions-button").onclick = () => { 
    if (currentInstructions == 8) {
        returnToHomeScreen();
    } else {
        currentInstructions++;
        updateInstructions();
    }
};

function addCard(hand, cardToAdd) {
    hand.push(cardToAdd);
}

function announce(message) {
  const announcement = document.getElementById('announcement');
  announcement.textContent = message;
}

function bidOrPass() {
  return new Promise((resolve) => {
    const bidBtn = document.getElementById("bid-btn");
    const passBtn = document.getElementById("pass-btn");

    bidBtn.disabled = false;
    passBtn.disabled = false;

    bidBtn.onclick = () => {
      resolve("bid");
    };
    passBtn.onclick = () => {
      resolve("pass");
    };
  });
}

async function callMisdealOrPass() {
    announce("You have all four 9s. Call a misdeal to restart the round.");

    return new Promise((resolve) => {
    const callMisdealBtn = document.getElementById("call-misdeal-btn");
    const passMisdealBtn = document.getElementById("pass-misdeal-btn");

    callMisdealBtn.disabled = false;
    passMisdealBtn.disabled = false;

    callMisdealBtn.onclick = () => {
      resolve("call misdeal");
    };
    passMisdealBtn.onclick = () => {
      resolve("pass");
    };
  });
}

function canCallMisdeal(playerNumber) {
    return playerHasCard(playerNumber, "9♥") && playerHasCard(playerNumber, "9♦") && 
           playerHasCard(playerNumber, "9♣") && playerHasCard(playerNumber, "9♠");
}

function canDeclareTrump(player, card) {
    if (whoStarted != player) return false;
    
    const cardRank = rank(card);
    const isKing = cardRank == "K";
    const isQueen = cardRank == "Q";
    if (!isKing && !isQueen) return false;

    const cardSuit = suit(card);
    const otherRank = isKing ? "Q" : "K";
    const otherCard = otherRank + cardSuit;
    return playerHand(player).includes(otherCard);
}

function cardVisibility(card) {
    if (card == giveToAlice || card == giveToBob || (widow.includes(card) && currentBid > 100)) {
        return colorCard(card);
    } else {
        return "?";
    }
}

function cardWins(leadCard, followCard) {
    const leadSuit = suit(leadCard);
    const followSuit = suit(followCard);
    const leadValue = value(leadCard);
    const followValue = value(followCard);

    if (followSuit == leadSuit) {
        return followValue > leadValue;
    } else {
        return isTrump(followSuit);
    }
}

function chooseBidAndGiveCards() {
  return new Promise(resolve => {
    const lessBtn = document.getElementById("bid-less-btn");
    const moreBtn = document.getElementById("bid-more-btn");
    const confirmBtn = document.getElementById("confirm-bid-btn");

    lessBtn.disabled = true;
    moreBtn.disabled = false;
    confirmBtn.disabled = false;

    const onLess = () => {
        currentBid -= 10;
        announce("You will play for " + currentBid + ".");
        if(currentBid == minimumBid) lessBtn.disabled = true;
        moreBtn.disabled = false;
    };

    const onMore = () => {
        currentBid += 10;
        announce("You will play for " + currentBid + ".");
        if(currentBid == maximumBid) moreBtn.disabled = true;
        lessBtn.disabled = false;
    };

    const onConfirm = () => {
        if (giveToAlice == null || giveToBob == null) {
            announce("Select one card to give to Alice and one to give to Bob.");
        } else {
            lessBtn.removeEventListener('click', onLess);
            moreBtn.removeEventListener('click', onMore);
            confirmBtn.removeEventListener('click', onConfirm);
            lessBtn.disabled = true;
            moreBtn.disabled = true;
            confirmBtn.disabled = true;
            resolve(currentBid);
        }
    };

    lessBtn.addEventListener('click', onLess);
    moreBtn.addEventListener('click', onMore);
    confirmBtn.addEventListener('click', onConfirm);
  });
}

function colorCard(card) {
  const redSuits = ['♥', '♦'];
  const color = redSuits.includes(card.slice(-1)) ? 'red' : 'black';
  return `<span style="color:${color}">${card}</span>`;
}

async function confirmBid() {
    playPhase = "confirm bid";
    announce(playerOrder[playerBidding] + " will play for at least " + currentBid + ".");
    updateButtons();

    minimumBid = currentBid;
    if (playerBidding == 0) {
        yourHand.push(...widow);
        updateHands();
        updateButtons();
        currentBid = await chooseBidAndGiveCards();
        transferCard(yourHand, aliceHand, giveToAlice);
        transferCard(yourHand, bobHand, giveToBob);
        updateHands();
        return playRound();
    } else if (playerBidding == 1) {
        aliceHand.push(...widow);
        updateHands();

        const winningness = handWinningness(aliceHand, []) + highestTrump(1);
        if (winningness < minimumBid && leftOfDealer == 1 && !(hasFolded.includes(1))) {
            setTimeout(() => { return fold(1); }, 2500);
        } else {
            setTimeout(() => announce("Alice will choose two cards to give away."), 2500);
            setTimeout(() => {
                transferCard(aliceHand, yourHand, randomCard(lowestCards(aliceHand)));
                transferCard(aliceHand, bobHand, randomCard(lowestCards(aliceHand)));
                widow = [];
                updateHands();
                currentBid = Math.max(roundDown(winningness), minimumBid);
                announce(`Alice will play for ${currentBid}.`)
            }, 5500);
            setTimeout(() => { return playRound(); }, 7500);
        }
    } else {
        bobHand.push(...widow);
        updateHands();

        const winningness = handWinningness(bobHand, []) + highestTrump(2);
        if (winningness < minimumBid && leftOfDealer == 2 && !(hasFolded.includes(2))) {
            setTimeout(() => { return fold(2); }, 2500);
        } else {
            setTimeout(() => announce("Bob will choose two cards to give away."), 2500);
            setTimeout(() => {
                transferCard(bobHand, yourHand, randomCard(lowestCards(bobHand)));
                transferCard(bobHand, aliceHand, randomCard(lowestCards(bobHand)));
                widow = [];
                updateHands();
                currentBid = Math.max(roundDown(winningness), minimumBid);
                announce(`Bob will play for ${currentBid}.`)
            }, 5500);
            setTimeout(() => { return playRound(); }, 7500);
        }
    }
}

function deal(deck) {
    yourHand = deck.splice(0,7);
    aliceHand = deck.splice(0,7);
    bobHand = deck.splice(0,7);
    widow = deck.splice(0,3);
    updateHands();
}

function declareTrump(player, suit) {
    const value = trumpValue(suit);
    announce(`${playerOrder[player]} played the ${value} trump.`);
    currentTrump = suit;
    roundScores[whoStarted] += value;
}

function declareTrumpOrPass() {
  return new Promise((resolve) => {
    playPhase = "declare trump";
    updateButtons();
    const declareTrumpBtn = document.getElementById("declare-trump-btn");
    const passBtn = document.getElementById("pass-trump-btn");

    declareTrumpBtn.disabled = false;
    passBtn.disabled = false;

    declareTrumpBtn.onclick = () => {
      resolve("declare trump");
    };
    passBtn.onclick = () => {
      resolve("pass");
    };
  });
}

function desirableCards(playerNumber) {
    const allCards = playableCards(playerNumber);
    const winningCards = allCards.filter(card => isSureWin(card));
    const losingCards = lowestCards(allCards);
    if (whoStarted == playerNumber) {
        if (winningCards.length > 0) {
            return winningCards;
        } else {
            const playableTrumps = allCards.filter(card => canDeclareTrump(playerNumber, card));
            if (playableTrumps.length > 0) {
                return playableTrumps;
            } else {
                return allCards;
            }
        }
    } else if (nextPlayerNumber(whoStarted) == playerNumber) {
        return losingCards;
    } else {
        const winThisTrick = allCards.filter(card => cardWins(cardsPlayed[0], card));
        if (winThisTrick.length > 0) {
            return winThisTrick;
        } else {
            return losingCards;
        }
    }
}

function returnToHomeScreen() {
    document.getElementById("game-container").style.display = "none";
    document.getElementById("start-screen-container").style.display = "flex";
    document.getElementById("instructions-container").style.display = "none";
}

async function endRound() {
    leftOfDealer = nextPlayerNumber(leftOfDealer);
    giveToAlice = null;
    giveToBob = null;
    currentTrump = null;
    currentBid = 100;
    roundScores = [0, 0, 0];

    const lastRound = scoreSheet.length - 1;
    if (scoreSheet[lastRound][0] >= 1000) {
        announce("You won! Congratulations!");
        await wait(5000);
        returnToHomeScreen();
    } else if (scoreSheet[lastRound][1] >= 1000) {
        announce("Alice won! Congratulations!");
        await wait(5000);
        returnToHomeScreen();
    } else if (scoreSheet[lastRound][2] >= 1000) {
        announce("Bob won! Congratulations!");
        await wait(5000);
        returnToHomeScreen();
    } else {
        announce("New round starting.");
        await wait(2000);
        return startRound();
    }
}

async function fold(playerNumber) {
    playPhase = "fold";
    updateButtons();
    announce(`${playerOrder[playerNumber]} will fold.`)
    hasFolded.push(playerNumber);

    roundScores = [60, 60, 60];
    roundScores[playerNumber] = 0;
    foldSheet.push([roundScores[0] == 0, roundScores[1] == 0, roundScores[2] == 0]);
    
    const numRounds = scoreSheet.length;
    let lastRoundScores;
    numRounds == 0 ? lastRoundScores = [0, 0, 0] : lastRoundScores = scoreSheet[numRounds - 1];
    
    const otherPlayer1 = nextPlayerNumber(playerNumber);
    const otherPlayer2 = nextPlayerNumber(otherPlayer1);
    if (lastRoundScores[otherPlayer1] >= 900) roundScores[otherPlayer1] = 0;
    if (lastRoundScores[otherPlayer2] >= 900) roundScores[otherPlayer2] = 0;

    let runningTotals = [];
    for (let i = 0; i < 3; i++) {
        runningTotals.push(lastRoundScores[i] + roundScores[i]);
    }
    scoreSheet.push(runningTotals);
    updateScoreboard();

    await wait(2000);
    endRound();
}

function handWinningness(botHand, winningCards) {
    let hand = [...botHand];
    let winning = [...winningCards];

    const handSize = hand.length;
    let cardsUpdated = 0;

    for (let i = handSize - 1; i >= 0; i--) {
        const card = hand[i];
        const cardRank = rank(card);
        const previousCardInOrder = previousCard(card);

        if (cardRank == "A" || winning.includes(previousCardInOrder)) {
            transferCard(hand, winning, card);
            cardsUpdated++;
        }
    }

    if (cardsUpdated == 0) {
        const winningness = sum(winning.map(value));
        return winningness;
    } else {
        return handWinningness(hand, winning);
    }
}

function hasBeenPlayed(card) {
    const inYourHand = yourHand.includes(card);
    const inAliceHand = aliceHand.includes(card);
    const inBobHand = bobHand.includes(card);
    return !inYourHand && !inAliceHand && !inBobHand;
}

function hasTrump(playerNumber) {
    whoStarted = playerNumber;
    const hand = playerHand(playerNumber);
    const handsize = hand.length;
    for (let i = 0; i < handsize; i++) {
        if (canDeclareTrump(playerNumber, hand[i])) return true;
    }
    return false;
}

function highestTrump(playerNumber) {
    whoStarted = playerNumber;
    const hand = playerHand(playerNumber);
    const handsize = hand.length;
    let highestValue = 0;
    for (let i = 0; i < handsize; i++) {
        const card = hand[i];
        if (canDeclareTrump(playerNumber, card)) {
            const value = trumpValue(suit(card));
            highestValue = Math.max(value, highestValue);
        }
    }
    return highestValue;
}

function isSureWin(card) {
    const cardRank = rank(card);
    if (cardRank == "A") {
        return true;
    } else {
        const lastCard = previousCard(card);
        const lastCardHasBeenPlayed = hasBeenPlayed(lastCard);
        if (lastCardHasBeenPlayed) {
            return isSureWin(lastCard);
        } else {
            return false;
        }
    }
}

function isTrump(suit) {
    return suit == currentTrump;
}

function lowestCards(cards) {
    const values = cards.map(card => value(card));
    const minValue = Math.min(...values);
    const minValueCards = cards.filter(card => value(card) == minValue);
    return minValueCards;
}

function nextPlayerNumber(playerNumber) {
    return (playerNumber + 1) % 3;
}

function playableCards(playerNumber) {
    const hand = playerHand(playerNumber);
    if (cardsPlayed.length == 0) return hand;

    const leadCard = cardsPlayed[0];
    const sameSuit = hand.filter(card => suit(card) == suit(leadCard));

    if (cardsPlayed.length == 2) {
        if (sameSuit.length == 0) {
            return hand;
        } else {
            return sameSuit;
        }
    } else {
        if (sameSuit.length == 0) {
            const trumps = hand.filter(card => isTrump(suit(card)));
            if (trumps.length == 0) {
                return hand;
            } else {
                return trumps;
            }
        } else {
            const higherValue = sameSuit.filter(card => value(card) > value(leadCard));
            if (higherValue.length == 0) {
                return sameSuit;
            } else {
                return higherValue;
            }
        }
    }
}

async function playCard(player, card) {
    removeCard(playerHand(player), card);
    announce(`${playerOrder[player]} played ${card}.`);
    updateHands();

    if (canDeclareTrump(player, card)) {
        const cardSuit = suit(card);
        if (player == 0) {
            const decision = await declareTrumpOrPass();
            playPhase = "play round";
            updateButtons();
            if (decision == "declare trump") {
                declareTrump(player, cardSuit);
            }
        } else {
            await wait(2000);
            declareTrump(player, cardSuit);
        }
    }
}

function playerHand(playerNumber) {
    if (playerNumber == 0) {
        return yourHand;
    } else if (playerNumber == 1) {
        return aliceHand;
    } else {
        return bobHand;
    }
}

function playerHasCard(playerNumber, card) {
    return playerHand(playerNumber).includes(card);
}

function playerMustPlayCard() {
    return new Promise((resolve) => {
        for (let i = 0; i < yourHand.length; i++) {
            const playCardButton = document.getElementById(`play-card-btn-${i}`)
            const card = yourHand[i];
            playCardButton.onclick = () => {
                resolve(card);
            };
        }
    });
}

async function playRound() {
    playPhase = "play round";
    updateButtons();
    announce("Round starting.");
    whoStarted = playerBidding;
    for (let turn = 0; turn < 8; turn++) {
        await wait(2000);
        whoStarted = await playTurn();
    }
    await wait(2000);
    return scoreRound();
}

async function playTurn() {
    whoseTurn = whoStarted;
    updateButtons();
    cardsPlayed = [];
    for (let player = 0; player < 3; player++) {
        if (whoseTurn == 0) {
            const card = await playerMustPlayCard()
            await playCard(0, card);
            cardsPlayed.push(card);
        } else {
            const card = randomCard(desirableCards(whoseTurn));
            await playCard(whoseTurn, card);
            cardsPlayed.push(card);
        }
        player == 2 ? whoseTurn = null : whoseTurn = nextPlayerNumber(whoseTurn);
        if (whoseTurn == 0) {
            await wait(2000);
            updateButtons();
        } else {
            updateButtons();
            await wait(2000);
        }
    }
    return scoreCards(cardsPlayed);
}

function possessor(player) {
    return player == "You" ? "your" : player + "'s";
}

function previousCard(card) {
    const cardRank = rank(card);
    if (cardRank == "A") {
        return null;
    } else {
    const indexInOrder = cardOrder.indexOf(card);
    return cardOrder[indexInOrder - 1];
    }
}

function randomCard(hand) {
    const handsize = hand.length;
    const number = Math.floor(Math.random() * handsize);
    return hand[number];
}

function rank(card) {
    return card.slice(0, -1);
}

function removeCard(hand, cardToRemove) {
    const index = hand.indexOf(cardToRemove);
    if (index != -1) {
        hand.splice(index, 1);
    }
}

function roundDown(number) {
    return Math.floor(number / 10) * 10;
}

function roundToNearest10(number) {
  return Math.round((number - 0.1) / 10) * 10;
}

function scoreCards(cards) {
    cardsPlayed = [];
    const card0 = cards[0];
    const card1 = cards[1];
    const card2 = cards[2];
    const totalScore = value(card0) + value(card1) + value(card2);
    const winner = whoWins(card0, card1, card2);
    if (winner == 1) {
        const playerNumber = nextPlayerNumber(whoStarted);
        roundScores[playerNumber] += totalScore;
        announce(`${playerOrder[playerNumber]} ${winOrWins(playerNumber)} the hand.`);
        return playerNumber;
    } else if (winner == 2) {
        const playerNumber = nextPlayerNumber(nextPlayerNumber(whoStarted));
        roundScores[playerNumber] += totalScore;
        announce(`${playerOrder[playerNumber]} ${winOrWins(playerNumber)} the hand.`);
        return playerNumber;
    } else {
        const playerNumber = whoStarted;
        roundScores[playerNumber] += totalScore;
        announce(`${playerOrder[playerNumber]} ${winOrWins(playerNumber)} the hand.`);
        return playerNumber;
    }
}

async function scoreRound() {
    const numRounds = scoreSheet.length;
    let lastRoundScores;
    numRounds == 0 ? lastRoundScores = [0, 0, 0] : lastRoundScores = scoreSheet[numRounds - 1];
    let runningTotals = [];

    const bidderSucceeded = roundScores[playerBidding] >= currentBid;
    if (bidderSucceeded) {
        announce(playerOrder[playerBidding] + " successfully earned " + currentBid + " points.");
    } else {
        announce(playerOrder[playerBidding] + " failed to earn " + currentBid + " points.");
    }
    await wait(2000);

    for (let i = 0; i < 3; i++) {
        let thisRoundScore = roundToNearest10(roundScores[i]);
        let lastRoundScore = lastRoundScores[i];
        if (i == playerBidding) {
            if (bidderSucceeded) {
                thisRoundScore = currentBid;
            } else {
                thisRoundScore = -1 * currentBid;
            }
        } else if (lastRoundScore >= 900) {
            thisRoundScore = 0;
        } else if (lastRoundScore + thisRoundScore >= 1000) {
            thisRoundScore = 990 - lastRoundScore;
        }
        runningTotals.push(lastRoundScore + thisRoundScore);
    }
    scoreSheet.push(runningTotals);
    foldSheet.push([false, false, false]);
    updateScoreboard();
    return endRound();
}

function showInstructions() {
    currentInstructions = 0;
    document.getElementById("start-screen-container").style.display = "none";
    document.getElementById("instructions-container").style.display = "block";
    updateInstructions();
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function sortCards(cards) {
    return cards.slice().sort((a, b) => {
        return cardOrder.indexOf(a) - cardOrder.indexOf(b);
    });
}

async function startBidding() {
    playPhase = "bidding";

    currentBidder = allowedToBid[0];
    updateButtons();

    if (allowedToBid.length <= 1) {
        playerBidding = currentBidder;
        return confirmBid();
    }

    if (currentBidder == 0) {
        if (currentBid >= maximumBid || (currentBid >= 120 && !hasTrump(0))) {
            announce("You will pass.");
            allowedToBid.shift();
        } else {
            const bidOrPassChoice = await bidOrPass();
            if (bidOrPassChoice == "pass") {
                announce("You will pass.");
                allowedToBid.shift();
            } else {
                currentBid += 10;
                announce("You will bid " + currentBid + ".");
                allowedToBid.push(allowedToBid.shift());
            }
        }
        currentBidder = allowedToBid[0];
        updateButtons();
    } else {
        if (wantsToBid(currentBidder) && currentBid < maximumBid) {
            currentBid += 10;
            announce(playerOrder[currentBidder] + " will bid " + currentBid + ".");
            allowedToBid.push(allowedToBid.shift());
        } else {
            announce(playerOrder[currentBidder] + " will pass.");
            allowedToBid.shift();
        }
    }

    await wait(2000);
    return startBidding();
}

function startGame() {
    document.getElementById("start-screen-container").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    leftOfDealer = Math.floor(Math.random() * 3);
    allowedToBid = [];
    playPhase = null;
    playerBidding = null;
    currentBid = 100;
    currentBidder = null;
    minimumBid = null;
    deck = [];
    yourHand = [];
    aliceHand = [];
    bobHand = [];
    widow = [];
    giveToAlice = null;
    giveToBob = null;
    whoStarted = null;
    whoseTurn = null;
    scoreSheet = [];
    foldSheet = [];
    roundScores = [0, 0, 0];
    currentTrump = null;
    cardsPlayed = [];
    hasFolded = [];
    startRound();
}

async function startRound() {
    allowedToBid = [];
    for (let i = 1; i <= 3; i++) {
        allowedToBid.push((leftOfDealer + i) % 3);
    }
    
    deck = ["A♥", "10♥", "K♥", "Q♥", "J♥", "9♥", 
            "A♦", "10♦", "K♦", "Q♦", "J♦", "9♦", 
            "A♣", "10♣", "K♣", "Q♣", "J♣", "9♣", 
            "A♠", "10♠", "K♠", "Q♠", "J♠", "9♠"];
    shuffle(deck);
    deal(deck);

    announce("It's " + possessor(playerOrder[leftOfDealer]) + " 100.");
    currentBidder = nextPlayerNumber(leftOfDealer);
    await wait(2000);

    if (canCallMisdeal(0)) {
        playPhase = "call misdeal";
        updateButtons();
        const choice = await callMisdealOrPass();
        playPhase = null;
        updateButtons();
        if (choice == "call misdeal") {
            announce("Restarting the round.");
            await wait(2000);
            startRound();
        } else {
            announce("It's still " + possessor(playerOrder[leftOfDealer]) + " 100.");
            await wait(2500);
            return startBidding();
        }
    } else if (canCallMisdeal(1)) {
        announce("Alice has called a misdeal.");
        await wait(2000);
        announce("Restarting the round.");
        await wait(2000);
        startRound();
    } else if (canCallMisdeal(2)) {
        announce("Bob has called a misdeal.");
        await wait(2000);
        announce("Restarting the round.");
        await wait(2000);
    } else {
        return startBidding();
    }
}

function suit(card) {
    return card.slice(-1);
}

function sum(numbers) {
    return numbers.reduce((acc, val) => acc + val, 0);
}

function transferCard(fromHand, toHand, card) {
    addCard(toHand, card);
    removeCard(fromHand, card);
}

function trumpValue(suit) {
    if (suit == "♥") {
        return 100;
    } else if (suit == "♦") {
        return 80;
    } else if (suit == "♣") {
        return 60;
    } else {
        return 40;
    }
}

function updateButtons() {
    const handsize = yourHand.length;
    let html = "";
    if (playPhase == "bidding") {
        html = `<button id="bid-btn">Bid ${currentBid + 10}</button>
                <button id="pass-btn">Pass</button><br><br>`;
    } else if (playPhase == "call misdeal") {
        html = `<button id="call-misdeal-btn">Call Misdeal</button>
                <button id="pass-misdeal-btn">Pass</button><br><br>`;
    } else if (playPhase == "confirm bid" && playerBidding == 0) {
        html = `<button id="fold-btn" disabled>Fold</button><br><br>
                <button id="bid-less-btn" disabled>-10</button>
                <button id="confirm-bid-btn" disabled>Play</button>
                <button id="bid-more-btn" disabled>+10</button><br><br>
                give card to Alice: `;
        for (let i = 0; i < handsize; i++) {
            html += `<button id="give-alice-btn-${i}">${yourHand[i]}</button> `;
        }
        html += `<br>give card to Bob: `;
        for (let i = 0; i < handsize; i++) {
            html += `<button id="give-bob-btn-${i}">${yourHand[i]}</button> `;
        }
    } else if (playPhase == "play round" && whoseTurn == 0) {
        html = `play card: `;
        for (let i = 0; i < handsize; i++) {
            html += `<button id="play-card-btn-${i}">${yourHand[i]}</button> `;
        }
    } else if (playPhase == "declare trump") {
        html = `<button id="declare-trump-btn">Declare Trump</button> 
                <button id="pass-trump-btn">Pass</button><br><br>`;
    }

    document.getElementById("buttons").innerHTML = html;

    if (playPhase == "bidding") {
        const bidButton = document.getElementById("bid-btn");
        const passButton = document.getElementById("pass-btn");
        bidButton.disabled = currentBidder != 0;
        passButton.disabled = currentBidder != 0;
    } else if (playPhase == "confirm bid" && playerBidding == 0) {
        for (let i = 0; i < handsize; i++) {
            const aliceButton = document.getElementById(`give-alice-btn-${i}`);
            const bobButton = document.getElementById(`give-bob-btn-${i}`);
            aliceButton.onclick = () => {
                giveToAlice = yourHand[i];
                announce("You will play for " + currentBid + ".");
                document.getElementById(`give-bob-btn-${i}`).disabled = true;
                for (let j = 0; j < handsize; j++) {
                    if (j != i) document.getElementById(`give-bob-btn-${j}`).disabled = false;
                }
            }
            bobButton.onclick = () => {
                giveToBob = yourHand[i];
                announce("You will play for " + currentBid + ".");
                document.getElementById(`give-alice-btn-${i}`).disabled = true;
                for (let j = 0; j < handsize; j++) {
                    if (j != i) document.getElementById(`give-alice-btn-${j}`).disabled = false;
                }
            }
            if (leftOfDealer == 0) {
                const foldButton = document.getElementById(`fold-btn`);
                foldButton.disabled = hasFolded.includes(0) && currentBid == 100;
                foldButton.onclick = () => { fold(0) }
            }
        }
    } else if (playPhase == "play round" && whoseTurn == 0) {
        for (let i = 0; i < handsize; i++) {
            const playCardButton = document.getElementById(`play-card-btn-${i}`)
            playCardButton.disabled = !(whoseTurn == 0 && playableCards(0).includes(yourHand[i]));
        }
    }
}

function updateHands() {
    yourHand = sortCards(yourHand);
    document.getElementById("alice-hand").innerHTML = "<b>Alice:</b> " + aliceHand.map(cardVisibility).join(", ");
    document.getElementById("bob-hand").innerHTML = "<b>Bob:</b> " + bobHand.map(cardVisibility).join(", ");
    document.getElementById("your-hand").innerHTML = "<b>You:</b> " + yourHand.map(colorCard).join(", ");
}

function updateInstructions() {
    document.getElementById("instructions-heading").innerHTML = instructionsHeadings[currentInstructions];
    for (let i = 0; i < 12; i++) {
        document.getElementById(`instructions-p${i}`).innerHTML = instructions[currentInstructions][i];
    }
}

function updateScoreboard() {
    const numRows = scoreSheet.length;
    let html = `<tr><th>You</th><th>Alice</th><th>Bob</th></tr>`;

    if (numRows == 0) {
        html += `<tr><td>0</td><td>0</td><td>0</td></tr>`;
    } else {
        for (let row = 0; row < numRows; row++) {
            let yourScore = scoreSheet[row][0];
            let aliceScore = scoreSheet[row][1];
            let bobScore = scoreSheet[row][2];

            if (row != 0 && yourScore == scoreSheet[row - 1][0]) yourScore = "—";
            if (row != 0 && aliceScore == scoreSheet[row - 1][1]) aliceScore = "—";
            if (row != 0 && bobScore == scoreSheet[row - 1][2]) bobScore = "—";

            if (foldSheet[row][0]) yourScore = "xxx";
            if (foldSheet[row][1]) aliceScore = "xxx";
            if (foldSheet[row][2]) bobScore = "xxx";

            html += `<tr><td>${yourScore}</td>
                         <td>${aliceScore}</td>
                         <td>${bobScore}</td></tr>`;
        }
    }

    document.getElementById("scoreboard").innerHTML = html;
}

function value(card) {
    const cardRank = rank(card);
    if (cardRank == "A") {
        return 11;
    } else if (cardRank == "10") {
        return 10;
    } else if (cardRank == "K") {
        return 4;
    } else if (cardRank == "Q") {
        return 3;
    } else if (cardRank == "J") {
        return 2;
    } else {
        return 0;
    }
}

async function wait(milliseconds) {
    await new Promise(r => setTimeout(r, milliseconds));
}

function wantsToBid(botNumber) {
    if (currentBid >= 120 && !hasTrump(botNumber)) return false;
    
    const botHand = playerHand(botNumber);
    const estimatedScore = handWinningness(botHand, []) + highestTrump(botNumber);

    return estimatedScore >= currentBid;
}

function whoWins(card0, card1, card2) {
    const card1Wins = cardWins(card0, card1);
    const card2Wins = cardWins(card0, card2);
    if (card1Wins) {
        if (card2Wins) {
            if (cardWins(card1, card2)) {
                return 2;
            } else {
                return 1;
            }
        } else {
            return 1;
        }
    } else {
        if (card2Wins) {
            return 2;
        } else {
            return 0;
        }
    }
}

function winOrWins(playerNumber) {
    if (playerNumber == 0) {
        return "win";
    } else {
        return "wins";
    }
}