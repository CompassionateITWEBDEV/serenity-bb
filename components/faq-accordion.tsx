"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQ {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  faqs: FAQ[];
}

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <Card 
            key={index} 
            className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => toggleFAQ(index)}
          >
            <CardContent className="p-0">
              <button className="w-full flex items-center justify-between p-4 text-left">
                <span className={`text-[15px] font-medium flex-1 ${isOpen ? 'text-teal-700' : 'text-teal-600'}`}>
                  {faq.q}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-teal-600 flex-shrink-0 ml-4" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-teal-600 flex-shrink-0 ml-4" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

