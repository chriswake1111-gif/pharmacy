
import { GoogleGenAI, Type } from "@google/genai";
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Employee, ShiftCode, StoreSchedule, ShiftDefinition } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

interface GenerateScheduleParams {
  employees: Employee[];
  dateRange: Date[];
  existingSchedule: StoreSchedule;
  shiftDefinitions: Record<string, ShiftDefinition>; // Added shift definitions
}

export const generateSmartSchedule = async ({
  employees,
  dateRange,
  existingSchedule,
  shiftDefinitions
}: GenerateScheduleParams): Promise<StoreSchedule> => {
  
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const startDateStr = format(dateRange[0], 'yyyy-MM-dd');
  const endDateStr = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');

  // Prepare simple structure for days to help AI
  const daysContext = dateRange.map(d => ({
    date: format(d, 'yyyy-MM-dd'),
    weekday: format(d, 'EEEE', { locale: zhTW }), // Monday, Tuesday...
    isWeekend: d.getDay() === 0 || d.getDay() === 6
  }));

  const employeeNames = employees.map(e => `${e.name} (ID: ${e.id})`).join(', ');
  
  // Use dynamic shift definitions
  const shiftTypes = Object.values(shiftDefinitions).map(s => `${s.code} (${s.label}: ${s.hours}hrs)`).join(', ');
  const shiftCodesList = Object.keys(shiftDefinitions).join(', ');

  const prompt = `
    I need to generate a pharmacy work schedule for the date range: ${startDateStr} to ${endDateStr}.
    
    Context:
    - Employees: ${employeeNames}
    - Available Shifts: ${shiftTypes}
    - Days to schedule: ${JSON.stringify(daysContext)}
    
    Rules:
    1. Distribute shifts fairly based on hours if possible.
    2. Ensure daily coverage: ideally at least one person opening and one person closing if shifts allow.
    3. Respect the provided dates and weekdays.
    4. Do not overwrite existing locked shifts if I provided any.
    5. Return a JSON object where keys are Date Strings (YYYY-MM-DD) and values are objects mapping Employee ID to ShiftCode.
    
    Use ShiftCodes: ${shiftCodesList}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                   date: { type: Type.STRING, description: "YYYY-MM-DD" },
                   assignments: {
                      type: Type.ARRAY,
                      items: {
                         type: Type.OBJECT,
                         properties: {
                            employeeId: { type: Type.STRING },
                            shiftCode: { type: Type.STRING }
                         }
                      }
                   }
                }
              }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    const result: StoreSchedule = {};

    if (json.schedule && Array.isArray(json.schedule)) {
      json.schedule.forEach((dayItem: any) => {
        const dateKey = dayItem.date;
        if (!result[dateKey]) result[dateKey] = {};
        
        if (dayItem.assignments && Array.isArray(dayItem.assignments)) {
          dayItem.assignments.forEach((assign: any) => {
             // Validate code exists
             if (shiftDefinitions[assign.shiftCode]) {
                result[dateKey][assign.employeeId] = assign.shiftCode;
             }
          });
        }
      });
    }

    return result;

  } catch (e) {
    console.error("AI Generation Error", e);
    throw e;
  }
};
