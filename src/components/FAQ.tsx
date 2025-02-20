// export default function FAQ() {
//     return (
//         <div className="space-y-4">
//   <details className="group [&_summary::-webkit-details-marker]:hidden" open>
//     <summary
//       className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-gray-50 p-4 text-gray-900"
//     >
//       <h2 className="font-medium">Lorem ipsum dolor sit amet consectetur adipisicing?</h2>

//       <svg
//         className="size-5 shrink-0 transition duration-300 group-open:-rotate-180"
//         xmlns="http://www.w3.org/2000/svg"
//         fill="none"
//         viewBox="0 0 24 24"
//         stroke="currentColor"
//       >
//         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
//       </svg>
//     </summary>

//     <p className="mt-4 px-4 leading-relaxed text-gray-700">
//       Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ab hic veritatis molestias culpa in,
//       recusandae laboriosam neque aliquid libero nesciunt voluptate dicta quo officiis explicabo
//       consequuntur distinctio corporis earum similique!
//     </p>
//   </details>

//   <details className="group [&_summary::-webkit-details-marker]:hidden">
//     <summary
//       className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-gray-50 p-4 text-gray-900"
//     >
//       <h2 className="font-medium">Lorem ipsum dolor sit amet consectetur adipisicing?</h2>

//       <svg
//         className="size-5 shrink-0 transition duration-300 group-open:-rotate-180"
//         xmlns="http://www.w3.org/2000/svg"
//         fill="none"
//         viewBox="0 0 24 24"
//         stroke="currentColor"
//       >
//         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
//       </svg>
//     </summary>

//     <p className="mt-4 px-4 leading-relaxed text-gray-700">
//       Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ab hic veritatis molestias culpa in,
//       recusandae laboriosam neque aliquid libero nesciunt voluptate dicta quo officiis explicabo
//       consequuntur distinctio corporis earum similique!
//     </p>
//   </details>
// </div>

//     )
// }


import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

const faqs = [
  {
    question: "How do guests submit song requests?",
    answer:
      "Guests can join an event by entering a unique room code. Once inside, they can submit song requests anonymously or with their name.",
  },
  {
    question: "Can the DJ remove or reorder song requests?",
    answer:
      "Yes! The DJ has full control over the request queue, including marking songs as played, removing requests, or prioritizing certain tracks.",
  },
  {
    question: "Do guests need to create an account to request songs?",
    answer:
      "No, guests can submit requests without an account—just enter the room code and start requesting!",
  },
  {
    question: "Can I export the tracklist after an event?",
    answer:
      "Absolutely! DJs can export the final playlist in a downloadable format to keep track of all the requested songs.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="relative isolate bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-base/7 font-semibold text-indigo-600">Understanding Sway</h2>
        <p className="mt-2 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
            Frequently Asked Questions
        </p>
      </div>
      <div className="mx-auto mt-12 max-w-3xl divide-y divide-gray-200">
        {faqs.map((faq, index) => (
          <div key={index} className="py-6">
            <button
              onClick={() => toggleFAQ(index)}
              className="flex w-full items-center justify-between text-left text-lg font-medium text-gray-900 sm:text-xl"
            >
              {faq.question}
              <ChevronDownIcon
                className={`h-6 w-6 transform transition-transform duration-300 ${
                  openIndex === index ? "rotate-180 text-indigo-500" : "text-gray-400"
                }`}
              />
            </button>
            {openIndex === index && (
              <p className="mt-3 text-gray-600 sm:text-lg">{faq.answer}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
