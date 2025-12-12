import express from 'express';
import { scoreInvestmentRouter } from './routes/scoreInvestment';
import getInvestments from './routes/getInvestments';
import getInvestmentById from './routes/getInvestmentById';

export const app = express();

app.use(express.json());
app.use('/score-investment', scoreInvestmentRouter);
app.use(getInvestments)
app.use(getInvestmentById)