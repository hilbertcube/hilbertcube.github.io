import { defineReferences } from "@utils/references";

export default defineReferences({
  nethercote2007valgrind: {
    type: "inproceedings",
    authors: ["Nicholas Nethercote", "Julian Seward"],
    title: "Valgrind: A framework for heavyweight dynamic binary instrumentation",
    proceedings:
      "Proceedings of the 2007 ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI)",
    pages: "89-100",
    location: "San Diego, CA",
    year: 2007,
    url: "https://valgrind.org/docs/valgrind2007.pdf",
  },
  seward2005: {
    type: "inproceedings",
    authors: ["Julian Seward", "Nicholas Nethercote"],
    title: "Using Valgrind to detect undefined value errors with bit-precision",
    proceedings: "Proceedings of the 2005 USENIX Annual Technical Conference",
    pages: "17-30",
    location: "Anaheim, CA",
    year: 2005,
    url: "https://valgrind.org/docs/memcheck2005.pdf",
  },
  nethercote2007shadow: {
    type: "inproceedings",
    authors: ["Nicholas Nethercote", "Julian Seward"],
    title: "How to shadow every byte of memory used by a program",
    proceedings:
      "Proceedings of the 3rd International Conference on Virtual Execution Environments (VEE)",
    pages: "65-74",
    location: "San Diego, CA",
    year: 2007,
    url: "https://valgrind.org/docs/shadow-memory2007.pdf",
  },
  weidendorfer2004: {
    type: "inproceedings",
    authors: ["Josef Weidendorfer", "Markus Kowarschik", "Carsten Trinitis"],
    title: "A tool suite for simulation based analysis of memory access behavior",
    proceedings:
      "Proceedings of the 4th International Conference on Computational Science (ICCS)",
    pages: "440-447",
    location: "Krakow, Poland",
    year: 2004,
    url: "https://valgrind.org/docs/callgrind2004.pdf",
  },
  nethercote2004: {
    type: "thesis",
    authors: "Nicholas Nethercote",
    title: "Dynamic Binary Analysis and Instrumentation",
    degree: "PhD",
    institution: "University of Cambridge",
    location: "Cambridge, UK",
    year: 2004,
    url: "https://valgrind.org/docs/phd2004.pdf",
  },
  valgrindManual: {
    type: "web",
    title: "Valgrind User Manual",
    url: "https://valgrind.org/docs/manual/manual.html",
    accessed: "2026-09-07",
  },
  memcheckManual: {
    type: "web",
    title: "Memcheck: a memory error detector",
    url: "https://valgrind.org/docs/manual/mc-manual.html",
    accessed: "2026-09-07",
  },
  callgrindManual: {
    type: "web",
    title: "Callgrind: a call-graph generating cache and branch prediction profiler",
    url: "https://valgrind.org/docs/manual/cl-manual.html",
    accessed: "2026-09-07",
  },
  massifManual: {
    type: "web",
    title: "Massif: a heap profiler",
    url: "https://valgrind.org/docs/manual/ms-manual.html",
    accessed: "2026-09-07",
  },
});
