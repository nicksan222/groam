import type { SeedGroup } from './seed-types';

const milan = {
  countryCode: 'IT',
  latitude: 45.4642,
  longitude: 9.19,
  name: 'Milan, Italy',
  placeId: 'seed:v3:milan'
} as const;
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

/** Elena, her sister and her brother-in-law, planning around family dates. */
export const marchettiFamily: SeedGroup = {
  members: ['hannah', 'daniel'],
  name: 'Marchetti Family',
  owner: 'elena',
  trips: [
    {
      key: 'milan-lake-como',
      name: 'Milan and Lake Como for Mamma’s birthday',
      currency: 'EUR',
      budget: 3400,
      dateNotes: 'Late May, around the 28th. Mamma turns 70 and wants lunch, not a party.',
      totalDays: 7,
      minimumDays: 5,
      idealDays: 7,
      stops: [
        {
          ...milan,
          firstDay: 1,
          lastDay: 3,
          notes: 'Mamma’s flat is small, so we take a hotel near Porta Venezia.'
        },
        {
          countryCode: 'IT',
          firstDay: 4,
          lastDay: 5,
          latitude: 45.9857,
          longitude: 9.2573,
          name: 'Bellagio, Italy',
          notes: 'Ferry from Varenna. Two rooms with a lake view if we can afford it.',
          placeId: 'seed:v3:bellagio'
        },
        {
          countryCode: 'IT',
          firstDay: 6,
          lastDay: 7,
          latitude: 45.808,
          longitude: 9.0852,
          name: 'Como, Italy',
          placeId: 'seed:v3:como'
        }
      ],
      activities: [
        {
          stop: 0,
          day: 1,
          block: 'afternoon',
          title: 'Malpensa Express to Cadorna and check in',
          notes: 'Hannah lands at 13:40, Daniel and Elena at 15:10. Meet at the hotel.'
        },
        {
          stop: 0,
          day: 2,
          block: 'morning',
          title: 'Duomo and Galleria Vittorio Emanuele II',
          time: ['10:00', '12:30']
        },
        {
          stop: 0,
          day: 2,
          block: 'evening',
          title: 'Birthday dinner at Trattoria Milanese',
          time: ['20:00', '22:30'],
          notes: 'Mamma’s favourite since the nineties. Table for six under Marchetti.'
        },
        {
          stop: 1,
          day: 4,
          block: 'morning',
          title: 'Train to Varenna and ferry to Bellagio',
          time: ['09:30', '12:00'],
          notes: 'Trains leave Milano Centrale hourly. Ferry is a short hop from Varenna-Esino.'
        },
        { stop: 1, day: 5, block: 'morning', title: 'Villa Melzi gardens' },
        {
          stop: 1,
          day: 5,
          block: 'afternoon',
          title: 'Lunch in Varenna and a walk to the castle ruins'
        },
        {
          stop: 2,
          day: 6,
          block: 'morning',
          title: 'Funicular up to Brunate',
          time: ['10:00', '12:00'],
          notes: 'Views over the whole lake. Elena’s mum will take the lift option.'
        },
        { stop: 2, day: 6, block: 'afternoon', title: 'Como old town and the silk museum' },
        {
          stop: 2,
          day: 7,
          block: 'morning',
          title: 'Train back to Milano Centrale and the airport',
          time: ['10:30', '12:30']
        }
      ],
      issues: [
        {
          title: 'Reserve the birthday dinner',
          body: 'Mamma wants her usual table. They want the headcount a week ahead and a deposit for groups over five.'
        },
        {
          title: 'Decide between a Bellagio hotel and a Varenna one',
          body: 'Bellagio is prettier but needs the ferry with bags. Varenna sits on the train line.'
        }
      ],
      researches: [
        {
          key: 'como-ferries',
          title: 'Ferries and trains around the lake',
          brief:
            'How do Varenna, Bellagio and Como connect by ferry and train, and can Mamma manage the steps?',
          issue: 'Decide between a Bellagio hotel and a Varenna one',
          messages: [
            {
              by: 'hannah',
              text: 'The fast ferry is the one to take between Bellagio and Como, the slow one stops everywhere.'
            },
            {
              by: 'daniel',
              text: 'Checked the timetable, there is no ferry after 18:00 out of season. Dinner needs to be in Bellagio itself.'
            }
          ]
        }
      ]
    },
    {
      key: 'rome-easter',
      name: 'Easter in Rome and Orvieto',
      currency: 'EUR',
      budget: 3000,
      dateNotes: 'Thursday 25 to Tuesday 30 March. Easter Sunday is the 28th.',
      startDate: '2027-03-25',
      totalDays: 6,
      minimumDays: 5,
      idealDays: 6,
      stops: [
        {
          ...rome,
          firstDay: 1,
          lastDay: 4,
          notes: 'Hotel near Campo de’ Fiori, walkable to almost everything.'
        },
        {
          countryCode: 'IT',
          firstDay: 5,
          lastDay: 6,
          latitude: 42.7185,
          longitude: 12.1107,
          name: 'Orvieto, Italy',
          notes: 'Direct train from Termini, about 80 minutes. Funicular from the station.',
          placeId: 'seed:v3:orvieto'
        }
      ],
      activities: [
        { stop: 0, day: 1, block: 'afternoon', title: 'Check in and walk to the Pantheon' },
        {
          stop: 0,
          day: 1,
          block: 'evening',
          title: 'Dinner in the Jewish Ghetto',
          notes: 'Carciofi alla giudia, the artichokes are in season.'
        },
        { stop: 0, day: 2, block: 'morning', title: 'Vatican Museums', time: ['09:00', '12:30'] },
        { stop: 0, day: 2, block: 'afternoon', title: 'Castel Sant’Angelo' },
        {
          stop: 0,
          day: 3,
          block: 'morning',
          title: 'Colosseum and Roman Forum',
          time: ['09:00', '12:30']
        },
        {
          stop: 0,
          day: 3,
          block: 'evening',
          title: 'Dinner at Roscioli',
          notes: 'Book weeks ahead, it is always full around Easter.'
        },
        {
          stop: 0,
          day: 4,
          block: 'afternoon',
          title: 'Easter Sunday lunch near Piazza Navona',
          time: ['13:00', '16:00'],
          notes: 'Most restaurants run a fixed menu on the day. Reserve now.'
        },
        {
          stop: 1,
          day: 5,
          block: 'morning',
          title: 'Train from Termini to Orvieto',
          time: ['09:22', '10:45']
        },
        { stop: 1, day: 5, block: 'afternoon', title: 'Duomo di Orvieto and the Underground tour' },
        { stop: 1, day: 5, block: 'evening', title: 'Dinner and wine at a cantina in the old town' }
      ],
      issues: [
        {
          title: 'Reserve Easter Sunday lunch',
          body: 'Places near Navona fill up. We need a table for five at around 13:00 with a vegetarian option.'
        }
      ],
      proposal: {
        title: 'Spend the second night in Orvieto instead of going back to Rome',
        notes: 'Slower, cheaper rooms, and the evening train back is crowded on Easter Monday.'
      }
    },
    {
      key: 'london-summer',
      name: 'London after Hannah’s conference',
      currency: 'GBP',
      budget: 2200,
      dateNotes:
        'Mid July. The conference ends on the 14th, so we pick up from there. Nothing booked yet.',
      totalDays: 4,
      minimumDays: 3,
      idealDays: 4,
      stops: [
        {
          ...london,
          firstDay: 1,
          lastDay: 4,
          notes: 'Somewhere central and quiet, Hannah is already booked near the venue.'
        }
      ],
      activities: [
        { stop: 0, day: 1, block: 'evening', title: 'Dinner in Soho after the last session' },
        { stop: 0, day: 2, block: 'morning', title: 'Kew Gardens' },
        {
          stop: 0,
          day: 3,
          block: 'afternoon',
          title: 'Greenwich and the Cutty Sark',
          notes: 'Take the Thames Clipper from Westminster if the weather holds.'
        }
      ],
      issues: [
        {
          title: 'Agree on dates',
          body: 'Daniel can only join from the 16th. Does it make sense to shift the trip by two days?'
        }
      ]
    }
  ]
};
