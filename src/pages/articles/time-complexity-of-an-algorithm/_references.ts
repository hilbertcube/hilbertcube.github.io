import { defineReferences } from "@utils/references";

export default defineReferences({
  cormen: {
    type: "book",
    authors: ["Thomas H. Cormen", "Charles E. Leiserson", "Ronald L. Rivest", "Clifford Stein"],
    title: "Introduction to Algorithms",
    note: "(CLRS)",
  },
  sedgewick: {
    type: "book",
    authors: ["Robert Sedgewick", "Kevin Wayne"],
    title: "Algorithms",
    edition: 4,
  },
  knuth: {
    type: "book",
    authors: "Donald E. Knuth",
    title: "The Art of Computer Programming",
  },
  cpAlgorithms: {
    type: "web",
    title: "Practical algorithm notes and proofs",
    url: "https://cp-algorithms.com/",
  },
  wikipediaBigO: {
    type: "web",
    title: "Big-O notation",
    note: "Reference for definitions and properties",
    url: "https://en.wikipedia.org/wiki/Big_O_notation",
  },
});
