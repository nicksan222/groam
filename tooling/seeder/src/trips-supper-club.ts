import type { SeedGroup } from './seed-types';

const rome = {
  countryCode: 'IT',
  latitude: 41.9028,
  longitude: 12.4964,
  name: 'Rome, Italy',
  placeId: 'seed:v3:rome'
} as const;
const london = {
  countryCode: 'GB',
  latitude: 51.5072,
  longitude: -0.1276,
  name: 'London, United Kingdom',
  placeId: 'seed:v3:london'
} as const;
const milan = {
  countryCode: 'IT',
  latitude: 45.4642,
  longitude: 9.19,
  name: 'Milan, Italy',
  placeId: 'seed:v3:milan'
} as const;

/** Four university friends who cook for each other once a month and travel together once a year. */
export const supperClub: SeedGroup = {
  members: ['tomas', 'priya', 'daniel'],
  name: 'Sunday Supper Club',
  owner: 'elena',
  trips: [
    {
      key: 'rome-long-weekend',
      name: 'Rome long weekend',
      currency: 'EUR',
      budget: 1800,
      dateNotes:
        'Dates agreed: Friday 9 to Monday 12 April. Flights booked separately; rooms still open.',
      startDate: '2027-04-09',
      totalDays: 4,
      minimumDays: 3,
      idealDays: 4,
      stops: [
        {
          ...rome,
          firstDay: 1,
          lastDay: 4,
          notes: 'Staying around Trastevere so everyone can walk home after dinner.'
        }
      ],
      activities: [
        {
          stop: 0,
          day: 1,
          block: 'afternoon',
          title: 'Check in and walk Trastevere',
          notes: 'Fiumicino to Termini on the Leonardo Express, then tram 8.'
        },
        {
          stop: 0,
          day: 1,
          block: 'evening',
          title: 'Dinner at Da Enzo al 29',
          time: ['20:00', '22:00'],
          notes: 'Small place, no online booking. Priya will call on the Thursday.'
        },
        {
          stop: 0,
          day: 2,
          block: 'morning',
          title: 'Vatican Museums and Sistine Chapel',
          time: ['08:30', '12:00'],
          notes: 'Timed entry, book as soon as tickets open. Shoulders and knees covered.'
        },
        {
          stop: 0,
          day: 2,
          block: 'afternoon',
          title: "St Peter's Basilica and the dome climb",
          notes: 'Daniel is not keen on the 551 steps. Lift goes part of the way.'
        },
        {
          stop: 0,
          day: 3,
          block: 'morning',
          title: 'Colosseum, Forum and Palatine Hill',
          time: ['09:00', '12:30'],
          notes: 'Combined ticket. The Forum has almost no shade, bring water.'
        },
        {
          stop: 0,
          day: 3,
          block: 'afternoon',
          title: 'Aperitivo in Monti'
        },
        {
          stop: 0,
          day: 3,
          block: 'evening',
          title: 'Cacio e pepe at Felice a Testaccio',
          time: ['20:30', '22:30']
        },
        {
          stop: 0,
          day: 4,
          block: 'morning',
          title: 'Galleria Borghese',
          time: ['09:00', '11:00'],
          notes: 'Two-hour slots only, so this fixes our checkout time.'
        }
      ],
      issues: [
        {
          title: 'Book the Vatican Museums slot',
          body: 'Tickets for April open about 60 days ahead. Someone needs to grab the 08:30 slot for five people.'
        },
        {
          title: 'Pick a hotel in Trastevere',
          body: 'Two twin rooms or one apartment. Budget is about 140 euros a night split four ways.'
        }
      ],
      researches: [
        {
          key: 'rome-trattorias',
          title: 'Trattorias that take bookings for four',
          brief:
            'Which Roman trattorias take reservations for a group of four, and what do they cost per head?',
          issue: 'Book the Vatican Museums slot',
          messages: [
            {
              by: 'priya',
              text: 'Da Enzo only takes phone bookings and Felice is booked weeks out. Calling both this week.'
            },
            {
              by: 'tomas',
              text: 'Felice in Testaccio is the cacio e pepe place everyone raves about, worth planning a day around.'
            },
            {
              by: 'elena',
              text: 'Fine by me. I would rather have two good dinners than four mediocre ones.'
            }
          ]
        }
      ]
    },
    {
      key: 'london-december',
      name: 'London in the week before Christmas',
      currency: 'GBP',
      budget: 2600,
      dateNotes:
        'Monday 14 to Friday 18 December. Taking the Eurostar from Milan is off the table, we fly.',
      startDate: '2026-12-14',
      totalDays: 5,
      minimumDays: 4,
      idealDays: 5,
      stops: [
        {
          ...london,
          firstDay: 1,
          lastDay: 5,
          notes: 'Near King’s Cross for the Piccadilly line to Heathrow on the way home.'
        }
      ],
      activities: [
        {
          stop: 0,
          day: 1,
          block: 'afternoon',
          title: 'Check in near King’s Cross'
        },
        {
          stop: 0,
          day: 1,
          block: 'evening',
          title: 'Winter Wonderland in Hyde Park',
          notes: 'Free entry, rides and mulled wine are pay as you go.'
        },
        {
          stop: 0,
          day: 2,
          block: 'morning',
          title: 'British Museum',
          time: ['10:00', '12:30'],
          notes: 'Free, but book a slot online. Rosetta Stone and the Parthenon marbles.'
        },
        {
          stop: 0,
          day: 2,
          block: 'afternoon',
          title: 'Lunch at Borough Market'
        },
        {
          stop: 0,
          day: 2,
          block: 'evening',
          title: 'West End show',
          notes: 'Not decided yet. Les Misérables and Wicked are both on.'
        },
        {
          stop: 0,
          day: 4,
          block: 'morning',
          title: 'Tate Modern and the Thames walk to Westminster',
          time: ['10:30', '13:00']
        },
        {
          stop: 0,
          day: 4,
          block: 'evening',
          title: 'Pub dinner in Clerkenwell',
          notes: 'Tomás has a friend who lives there and wants to join.'
        },
        {
          stop: 0,
          day: 5,
          block: 'morning',
          title: 'Breakfast at Dishoom then to Heathrow',
          time: ['08:00', '09:30'],
          notes: 'Flight at 14:20, leave the hotel by 10:30.'
        }
      ],
      issues: [
        {
          title: 'Choose a West End show',
          body: 'Two of us want Les Mis, two want Wicked. Seats together in the stalls disappear a month ahead.'
        }
      ],
      proposal: {
        title: 'Swap Winter Wonderland for the Southbank Christmas market',
        notes: 'Quieter on a Monday evening and closer to the hotel; keep the dinner slot.'
      }
    },
    {
      key: 'milan-september',
      name: 'Milan in September',
      currency: 'EUR',
      budget: 1100,
      dateNotes: 'Friday 18 to Sunday 20 September 2026. Done and dusted.',
      startDate: '2026-09-18',
      totalDays: 3,
      minimumDays: 3,
      idealDays: 3,
      archived: true,
      stops: [
        {
          ...milan,
          firstDay: 1,
          lastDay: 3,
          notes: 'Airbnb in Navigli, five minutes from the canals.'
        }
      ],
      activities: [
        { stop: 0, day: 1, block: 'afternoon', title: 'Duomo rooftop terraces' },
        {
          stop: 0,
          day: 1,
          block: 'evening',
          title: 'Aperitivo along the Navigli canals',
          time: ['18:30', '21:00']
        },
        {
          stop: 0,
          day: 2,
          block: 'morning',
          title: 'The Last Supper at Santa Maria delle Grazie',
          time: ['09:15', '10:00'],
          notes: 'Booked months ahead through the official site, 15 minutes inside.'
        },
        { stop: 0, day: 2, block: 'afternoon', title: 'Brera district and Pinacoteca' },
        {
          stop: 0,
          day: 3,
          block: 'morning',
          title: 'Risotto alla milanese brunch at Trattoria Milanese',
          time: ['11:00', '13:00']
        }
      ]
    }
  ]
};
